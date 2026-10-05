-- =============================================================================
-- 0011_global_catalog.sql — shared, barcode-keyed product identity.
--
-- Two shops selling the same "Amul Milk 1L" today each type that name into
-- their own products table independently, and search only ever compares
-- them by fuzzy name matching. This migration adds a crowd-sourced,
-- barcode-keyed reference catalog: the first shop to add a barcode
-- contributes its name/brand/unit/category; every shop after that scans
-- the same barcode and gets those fields pre-filled instead of retyping
-- them slightly differently. Price and stock stay exactly where they
-- already were — per org, per location — this only makes the *identity*
-- (the name customers search for) consistent across shops, which is what
-- actually makes "compare prices nearby" work well.
-- =============================================================================

create table global_products (
  id uuid primary key default gen_random_uuid(),
  barcode text not null unique,
  name text not null,
  brand text,
  unit product_unit not null default 'piece',
  category_id uuid references categories (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index global_products_barcode_idx on global_products (barcode);

alter table global_products enable row level security;
-- Public read (it's a barcode -> name lookup, no different from a shop's
-- own product name being visible). No client write policy at all: rows are
-- only ever written by the SECURITY DEFINER functions below, opportunistically,
-- as a side effect of a shop adding a product — never edited directly.
create policy "global_products_public_read" on global_products for select using (true);

create trigger trg_global_products_updated_at before update on global_products for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed/enrich the shared catalog whenever a barcoded product or variant is
-- created — "first shop to scan it wins" is the deliberate tie-break; this
-- is best-effort seed data other shops can override for their own listing,
-- not a source of truth anyone edits directly.
-- ---------------------------------------------------------------------------
create or replace function create_product_with_variant(
  p_organization_id uuid,
  p_location_id uuid,
  p_category_id uuid,
  p_name text,
  p_description text,
  p_brand text,
  p_unit product_unit,
  p_variant_name text,
  p_sku text,
  p_barcode text,
  p_amount_minor int,
  p_currency_code char(3),
  p_stock_qty numeric,
  p_images text[] default '{}'
) returns product_with_variant_result
language plpgsql security definer set search_path = public as $$
declare
  v_product products;
  v_variant_id uuid;
begin
  if not is_org_member(p_organization_id, array['owner','admin','manager']::member_role[]) then
    raise exception 'not authorized to add products to this organization';
  end if;
  if p_amount_minor is null or p_amount_minor < 0 then
    raise exception 'price must be zero or more';
  end if;

  insert into products (organization_id, category_id, name, description, brand, unit, images)
  values (p_organization_id, p_category_id, p_name, nullif(p_description, ''), nullif(p_brand, ''), p_unit, coalesce(p_images, '{}'))
  returning * into v_product;

  insert into product_variants (product_id, variant_name, sku, barcode)
  values (v_product.id, coalesce(nullif(p_variant_name, ''), 'Default'), nullif(p_sku, ''), nullif(p_barcode, ''))
  returning id into v_variant_id;

  insert into prices (variant_id, location_id, amount_minor, currency_code)
  values (v_variant_id, p_location_id, p_amount_minor, p_currency_code);

  insert into inventory (location_id, variant_id, stock_qty, is_available)
  values (p_location_id, v_variant_id, coalesce(p_stock_qty, 0), true);

  if p_barcode is not null and trim(p_barcode) <> '' then
    insert into global_products (barcode, name, brand, unit, category_id)
    values (trim(p_barcode), p_name, nullif(p_brand, ''), p_unit, p_category_id)
    on conflict (barcode) do nothing;
  end if;

  return row(v_product, v_variant_id)::product_with_variant_result;
end;
$$;

create or replace function add_product_variant(
  p_product_id uuid,
  p_location_id uuid,
  p_variant_name text,
  p_sku text,
  p_barcode text,
  p_amount_minor int,
  p_currency_code char(3),
  p_stock_qty numeric
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_org_id uuid;
  v_product products;
  v_variant_id uuid;
begin
  select * into v_product from products where id = p_product_id;
  if v_product.id is null then
    raise exception 'product % not found', p_product_id;
  end if;
  v_org_id := v_product.organization_id;
  if not is_org_member(v_org_id, array['owner','admin','manager']::member_role[]) then
    raise exception 'not authorized';
  end if;
  if p_amount_minor is null or p_amount_minor < 0 then
    raise exception 'price must be zero or more';
  end if;

  insert into product_variants (product_id, variant_name, sku, barcode)
  values (p_product_id, coalesce(nullif(p_variant_name, ''), 'Default'), nullif(p_sku, ''), nullif(p_barcode, ''))
  returning id into v_variant_id;

  insert into prices (variant_id, location_id, amount_minor, currency_code)
  values (v_variant_id, p_location_id, p_amount_minor, p_currency_code);

  insert into inventory (location_id, variant_id, stock_qty, is_available)
  values (p_location_id, v_variant_id, coalesce(p_stock_qty, 0), true);

  if p_barcode is not null and trim(p_barcode) <> '' then
    insert into global_products (barcode, name, brand, unit, category_id)
    values (trim(p_barcode), v_product.name, v_product.brand, v_product.unit, v_product.category_id)
    on conflict (barcode) do nothing;
  end if;

  return v_variant_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Search: an exact barcode match is a stronger comparison signal than fuzzy
-- name matching — if the customer's query is itself a barcode (scanned or
-- typed), match on it directly, on top of the existing name search.
-- ---------------------------------------------------------------------------
create or replace function search_products_nearby(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters double precision default 5000,
  p_query text default null,
  p_category_id uuid default null,
  p_limit int default 30
) returns setof product_search_result
language sql stable as $$
  select
    p.id, pv.id, p.name, pv.variant_name, p.unit,
    p.organization_id, o.name, o.slug,
    l.id, l.name, l.slug,
    pr.amount_minor, pr.currency_code,
    inv.stock_qty, inv.is_available,
    st_distance(l.geom, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_meters
  from products p
  join product_variants pv on pv.product_id = p.id
  join inventory inv on inv.variant_id = pv.id
  join locations l on l.id = inv.location_id
  join organizations o on o.id = p.organization_id
  join prices pr on pr.variant_id = pv.id and pr.location_id = l.id
  where p.is_active
    and p.deleted_at is null
    and l.status = 'active'
    and o.status = 'active'
    and l.geom is not null
    and st_dwithin(l.geom, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_meters)
    and (
      p_query is null
      or p.name ilike '%' || p_query || '%'
      or similarity(p.name, p_query) > 0.2
      or pv.barcode = p_query
    )
    and (p_category_id is null or p.category_id = p_category_id)
  order by distance_meters asc
  limit p_limit;
$$;
