-- =============================================================================
-- 0013_merchant_notifications.sql — the merchant side of the notification
-- loop, not just the customer side.
--
-- notifications.user_id is one row per recipient, so "notify the shop" is
-- "notify every active staff member of that org" — one helper, reused by
-- both place_order() (new order — the merchant needs to know to act) and
-- transition_order_status() (picked up — confirmation the sale is done,
-- useful when the person who scanned isn't the person who packed it).
-- =============================================================================

create function notify_org_staff(p_organization_id uuid, p_type text, p_title text, p_body text, p_data jsonb default '{}')
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, type, title, body, data)
  select m.user_id, p_type, p_title, p_body, p_data
  from organization_members m
  where m.organization_id = p_organization_id and m.status = 'active';
end;
$$;

create or replace function place_order(
  p_organization_id uuid,
  p_location_id uuid,
  p_items jsonb,
  p_notes text default null,
  p_coupon_code text default null
)
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
  v_offer offers;
  v_currency char(3);
  v_subtotal int := 0;
  v_tax int := 0;
  v_discount int := 0;
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

  if p_coupon_code is not null and trim(p_coupon_code) <> '' then
    select * into v_offer from offers
      where organization_id = p_organization_id
        and code = upper(trim(p_coupon_code))
        and is_active
        and (valid_from is null or valid_from <= now())
        and (valid_to is null or valid_to >= now())
        and (usage_limit is null or redeemed_count < usage_limit)
      for update;

    if not found then
      raise exception 'that coupon isn''t valid';
    end if;
    if v_subtotal < v_offer.min_order_minor then
      raise exception 'this order doesn''t meet the coupon''s minimum';
    end if;

    v_discount := case v_offer.type
      when 'percent' then round(v_subtotal * v_offer.value / 100)::int
      else round(v_offer.value)::int
    end;
    v_discount := least(v_discount, v_subtotal);

    update offers set redeemed_count = redeemed_count + 1 where id = v_offer.id;
  end if;

  update orders set
    subtotal_minor = v_subtotal,
    tax_minor = v_tax,
    discount_minor = v_discount,
    total_minor = greatest(v_subtotal + v_tax - v_discount, 0),
    currency_code = v_currency,
    offer_code = case when v_discount > 0 then upper(trim(p_coupon_code)) else null end
  where id = v_order.id
  returning * into v_order;

  insert into order_status_history (order_id, from_status, to_status, changed_by)
  values (v_order.id, null, 'placed', v_customer);

  insert into notifications (user_id, type, title, body, data)
  values (v_customer, 'order_placed', 'Order placed', v_order.order_number || ' has been sent to the shop.', jsonb_build_object('order_id', v_order.id));

  perform notify_org_staff(
    p_organization_id,
    'new_order',
    'New order ' || v_order.order_number,
    v_order.total_minor::text || ' ' || v_order.currency_code || ' — accept it from the orders queue.',
    jsonb_build_object('order_id', v_order.id)
  );

  return v_order;
end;
$$;

create or replace function transition_order_status(p_order_id uuid, p_new_status order_status, p_note text default null)
returns orders language plpgsql security definer set search_path = public as $$
declare
  v_order orders;
  v_is_customer boolean;
  v_is_staff boolean;
  v_valid boolean := false;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'order % not found', p_order_id;
  end if;

  v_is_customer := v_order.customer_id = auth.uid();
  v_is_staff := is_org_member(v_order.organization_id, array['owner','admin','manager','cashier','staff']::member_role[]);

  if not (v_is_customer or v_is_staff or is_platform_admin()) then
    raise exception 'not authorized to change this order';
  end if;

  v_valid := (v_order.status = 'placed' and p_new_status in ('accepted', 'cancelled'))
    or (v_order.status = 'accepted' and p_new_status in ('packing', 'cancelled'))
    or (v_order.status = 'packing' and p_new_status in ('ready_for_pickup', 'cancelled'))
    or (v_order.status = 'ready_for_pickup' and p_new_status = 'picked_up')
    or (v_order.status = 'picked_up' and p_new_status = 'completed');

  if not v_valid then
    raise exception 'invalid transition from % to %', v_order.status, p_new_status;
  end if;

  if p_new_status = 'cancelled' and v_order.status <> 'placed' and not (v_is_staff or is_platform_admin()) then
    raise exception 'only shop staff can cancel an order once accepted';
  end if;
  if p_new_status in ('accepted','packing','ready_for_pickup','picked_up','completed') and not (v_is_staff or is_platform_admin()) then
    raise exception 'only shop staff can advance this order';
  end if;

  update orders set
    status = p_new_status,
    cancel_reason = case when p_new_status = 'cancelled' then p_note else cancel_reason end,
    accepted_at = case when p_new_status = 'accepted' then now() else accepted_at end,
    packing_at = case when p_new_status = 'packing' then now() else packing_at end,
    ready_at = case when p_new_status = 'ready_for_pickup' then now() else ready_at end,
    picked_up_at = case when p_new_status = 'picked_up' then now() else picked_up_at end,
    completed_at = case when p_new_status = 'completed' then now() else completed_at end,
    cancelled_at = case when p_new_status = 'cancelled' then now() else cancelled_at end
  where id = p_order_id
  returning * into v_order;

  insert into order_status_history (order_id, from_status, to_status, changed_by, note)
  values (p_order_id, v_order.status, p_new_status, auth.uid(), p_note);

  insert into notifications (user_id, type, title, body, data)
  values (
    v_order.customer_id,
    'order_' || p_new_status,
    case p_new_status
      when 'accepted' then 'Order accepted'
      when 'packing' then 'Your order is being packed'
      when 'ready_for_pickup' then 'Ready for pickup'
      when 'picked_up' then 'Order picked up'
      when 'completed' then 'Order completed'
      when 'cancelled' then 'Order cancelled'
    end,
    case p_new_status
      when 'ready_for_pickup' then 'Your order ' || v_order.order_number || ' is ready. Show your QR code at the counter.'
      else 'Order ' || v_order.order_number || ' is now ' || p_new_status
    end,
    jsonb_build_object('order_id', v_order.id, 'status', p_new_status)
  );

  -- The merchant side of the loop: confirm pickup to every staff member,
  -- not just whoever happened to scan the QR.
  if p_new_status = 'picked_up' then
    perform notify_org_staff(
      v_order.organization_id,
      'order_picked_up',
      'Order ' || v_order.order_number || ' picked up',
      'Marked complete — nothing further to do.',
      jsonb_build_object('order_id', v_order.id)
    );
  end if;

  return v_order;
end;
$$;
