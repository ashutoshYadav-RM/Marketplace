-- =============================================================================
-- 0009_reviews_offers.sql — Phase 8: reviews, reorder, offers/coupons.
--
-- Reviews and offers are both single-row operations already fully covered
-- by RLS from 0001 (`reviews_customer_insert` already enforces "order must
-- be completed and belong to you"; `offers_manager_write` already scopes
-- creation to org managers) — neither needs an RPC. The one thing that
-- does: applying a coupon at checkout, because the discount amount must be
-- computed from the offer's own rules server-side, never accepted as a
-- number from the client. That extends place_order() rather than adding a
-- second checkout path.
-- =============================================================================

alter table offers add column redeemed_count int not null default 0;
alter table orders add column offer_code text;

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

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- Offers near you — same radius-search shape as locations/products/services.
-- ---------------------------------------------------------------------------
create type offer_search_result as (
  offer_id uuid,
  code text,
  type offer_type,
  value numeric,
  currency_code char(3),
  organization_id uuid,
  organization_name text,
  organization_slug text,
  location_slug text,
  distance_meters double precision
);

create function search_offers_nearby(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters double precision default 5000,
  p_limit int default 10
) returns setof offer_search_result
language sql stable as $$
  select distinct on (of.id)
    of.id, of.code, of.type, of.value, of.currency_code,
    o.id, o.name, o.slug, l.slug,
    st_distance(l.geom, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_meters
  from offers of
  join organizations o on o.id = of.organization_id
  join locations l on l.organization_id = of.organization_id
  where of.is_active
    and (of.valid_from is null or of.valid_from <= now())
    and (of.valid_to is null or of.valid_to >= now())
    and (of.usage_limit is null or of.redeemed_count < of.usage_limit)
    and l.status = 'active'
    and o.status = 'active'
    and l.geom is not null
    and st_dwithin(l.geom, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_meters)
  order by of.id, distance_meters asc
  limit p_limit;
$$;
