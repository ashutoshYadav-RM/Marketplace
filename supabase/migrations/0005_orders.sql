-- =============================================================================
-- 0005_orders.sql — Phase 4: cart checkout -> PLACED, merchant Accept/Pack/Ready.
--
-- There is no "cart" table — a cart is client-side state (see
-- src/modules/cart) until the customer checks out, which is the moment it
-- becomes real: one atomic `place_order()` call that re-prices every line
-- from `prices`/`inventory` itself (never the client's numbers), locks and
-- decrements stock, and only then inserts `orders` + `order_items`. Once an
-- order exists, every status change still goes through
-- `transition_order_status()` from 0001 — this migration doesn't touch that
-- function, only retires the now-unused direct-insert policies on `orders`
-- and adds the price/stock trust boundary in front of them.
-- =============================================================================

create function place_order(p_organization_id uuid, p_location_id uuid, p_items jsonb, p_notes text default null)
returns orders
language plpgsql security definer set search_path = public as $$
declare
  v_customer uuid := auth.uid();
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
  if v_customer is null then
    raise exception 'must be signed in to place an order';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'cart is empty';
  end if;

  -- Placeholder currency — overwritten below once the first line item's
  -- price is known; never visible outside this transaction.
  insert into orders (organization_id, location_id, customer_id, order_type, status, currency_code, pickup_code, notes)
  values (p_organization_id, p_location_id, v_customer, 'pickup', 'placed', 'XXX',
          upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)), p_notes)
  returning * into v_order;

  for v_item in select * from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity numeric) loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'invalid quantity';
    end if;

    select pv.* into v_variant from product_variants pv where pv.id = v_item.variant_id;
    if not found then raise exception 'product no longer available'; end if;

    select p.* into v_product from products p
      where p.id = v_variant.product_id and p.organization_id = p_organization_id and p.is_active and p.deleted_at is null;
    if not found then raise exception 'product no longer available'; end if;

    select pr.* into v_price from prices pr
      where pr.variant_id = v_item.variant_id and pr.location_id = p_location_id
      order by effective_from desc limit 1;
    if not found then raise exception 'this item is not sold at that location'; end if;

    if v_currency is null then
      v_currency := v_price.currency_code;
    elsif v_currency <> v_price.currency_code then
      raise exception 'an order cannot mix currencies';
    end if;

    select inv.* into v_inv from inventory inv
      where inv.location_id = p_location_id and inv.variant_id = v_item.variant_id
      for update;
    if not found or not v_inv.is_available or v_inv.stock_qty < v_item.quantity then
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
    total_minor = v_subtotal + v_tax,
    currency_code = v_currency
  where id = v_order.id
  returning * into v_order;

  insert into order_status_history (order_id, from_status, to_status, changed_by)
  values (v_order.id, null, 'placed', v_customer);

  insert into notifications (user_id, type, title, body, data)
  values (v_customer, 'order_placed', 'Order placed', v_order.order_number || ' has been sent to the shop.', jsonb_build_object('order_id', v_order.id));

  return v_order;
end;
$$;

-- Now that place_order() is the only trusted way to create an order, retire
-- the direct-insert policies from 0001 — a raw client INSERT skipped price
-- lookup and stock locking entirely.
drop policy "orders_customer_insert" on orders;
drop policy "order_items_customer_insert" on order_items;

-- Shop staff need the customer's name to fulfill an order — but only for a
-- customer who actually has an order at their organization, and only
-- because that relationship exists (not a general staff-reads-any-profile
-- hole). profiles_self_select from 0001 still covers everyone reading their
-- own row.
create policy "profiles_staff_read_via_order" on profiles for select using (
  exists (
    select 1 from orders o
    where o.customer_id = profiles.id
      and is_org_member(o.organization_id, array['owner','admin','manager','cashier','staff']::member_role[])
  )
);
