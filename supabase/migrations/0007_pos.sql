-- =============================================================================
-- 0007_pos.sql — Phase 6: Scan & Bill (in-person POS sales).
--
-- A POS sale is still an `orders` row — one ledger, not a parallel `bills`
-- table — but it skips the pickup state machine entirely: a walk-in
-- transaction is complete the moment it's rung up, so it's created directly
-- as 'completed'. The one real schema change this forces: a walk-in
-- customer may have no account, so `customer_id` becomes nullable — but
-- only for order_type = 'pos'; every other order type still requires one.
-- =============================================================================

alter type order_type add value 'pos';

alter table orders alter column customer_id drop not null;
alter table orders add constraint orders_customer_required_unless_pos
  check (order_type = 'pos' or customer_id is not null);

-- Which staff member rang up the sale — meaningful for POS, left null for
-- customer-placed orders (their own account already identifies them).
alter table orders add column created_by uuid references auth.users (id);

create function create_pos_sale(
  p_organization_id uuid,
  p_location_id uuid,
  p_items jsonb,
  p_discount_minor int default 0
) returns orders
language plpgsql security definer set search_path = public as $$
declare
  v_staff uuid := auth.uid();
  v_order orders;
  v_item record;
  v_price prices;
  v_inv inventory;
  v_product products;
  v_variant product_variants;
  v_currency char(3);
  v_subtotal int := 0;
  v_tax int := 0;
  v_line_total int;
  v_line_tax numeric;
  v_tax_rate numeric;
begin
  if not is_org_member(p_organization_id, array['owner','admin','manager','cashier']::member_role[]) then
    raise exception 'not authorized to generate a bill for this organization';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'bill has no items';
  end if;

  insert into orders (organization_id, location_id, customer_id, order_type, status, currency_code, discount_minor, created_by, completed_at)
  values (p_organization_id, p_location_id, null, 'pos', 'completed', 'XXX', greatest(coalesce(p_discount_minor, 0), 0), v_staff, now())
  returning * into v_order;

  for v_item in select * from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity numeric) loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'invalid quantity';
    end if;

    select pv.* into v_variant from product_variants pv where pv.id = v_item.variant_id;
    if not found then raise exception 'product no longer available'; end if;

    select p.* into v_product from products p
      where p.id = v_variant.product_id and p.organization_id = p_organization_id and p.deleted_at is null;
    if not found then raise exception 'product no longer available'; end if;

    select pr.* into v_price from prices pr
      where pr.variant_id = v_item.variant_id and pr.location_id = p_location_id
      order by effective_from desc limit 1;
    if not found then raise exception 'this item is not sold at that location'; end if;

    if v_currency is null then
      v_currency := v_price.currency_code;
    elsif v_currency <> v_price.currency_code then
      raise exception 'a bill cannot mix currencies';
    end if;

    select inv.* into v_inv from inventory inv
      where inv.location_id = p_location_id and inv.variant_id = v_item.variant_id
      for update;
    if not found or v_inv.stock_qty < v_item.quantity then
      raise exception 'not enough stock for %', v_variant.variant_name;
    end if;

    v_tax_rate := coalesce((select rate_percent from tax_classes where id = v_price.tax_class_id), 0);
    v_line_total := round(v_price.amount_minor * v_item.quantity)::int;
    v_line_tax := round(v_line_total * v_tax_rate / 100);

    insert into order_items (order_id, variant_id, name_snapshot, unit_price_minor, quantity, unit, tax_minor, total_minor)
    values (
      v_order.id, v_item.variant_id,
      v_product.name || case when v_variant.variant_name <> 'Default' then ' — ' || v_variant.variant_name else '' end,
      v_price.amount_minor, v_item.quantity, v_product.unit, v_line_tax, v_line_total + v_line_tax
    );

    update inventory set stock_qty = stock_qty - v_item.quantity, updated_at = now()
    where location_id = p_location_id and variant_id = v_item.variant_id;

    v_subtotal := v_subtotal + v_line_total;
    v_tax := v_tax + v_line_tax;
  end loop;

  update orders set
    subtotal_minor = v_subtotal,
    tax_minor = v_tax,
    total_minor = greatest(v_subtotal + v_tax - v_order.discount_minor, 0),
    currency_code = v_currency
  where id = v_order.id
  returning * into v_order;

  insert into order_status_history (order_id, from_status, to_status, changed_by)
  values (v_order.id, null, 'completed', v_staff);

  return v_order;
end;
$$;
