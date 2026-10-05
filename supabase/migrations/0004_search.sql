-- =============================================================================
-- 0004_search.sql — Phase 3: PostGIS radius search.
--
-- Three read-only functions, all SECURITY INVOKER (the default — no reason
-- to bypass RLS for a query that only ever returns what `*_public_read`
-- already allows anyone to see). Kept as plain SQL functions, called only
-- from `src/modules/search/data/`, so the day this moves to a dedicated
-- search engine, the module boundary is already exactly where the cut goes
-- — see blueprint §01/§09.
-- =============================================================================

create type location_nearby_result as (
  location_id uuid,
  organization_id uuid,
  organization_name text,
  organization_slug text,
  location_name text,
  location_slug text,
  city text,
  locality text,
  is_verified boolean,
  distance_meters double precision
);

create function search_locations_nearby(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters double precision default 5000,
  p_category_id uuid default null,
  p_limit int default 30
) returns setof location_nearby_result
language sql stable as $$
  select distinct on (l.id)
    l.id, l.organization_id, o.name, o.slug, l.name, l.slug, l.city, l.locality, l.is_verified,
    st_distance(l.geom, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_meters
  from locations l
  join organizations o on o.id = l.organization_id
  left join location_categories lc on lc.location_id = l.id
  where l.status = 'active'
    and o.status = 'active'
    and l.geom is not null
    and st_dwithin(l.geom, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_meters)
    and (p_category_id is null or lc.category_id = p_category_id or exists (
      select 1 from products p where p.organization_id = l.organization_id and p.category_id = p_category_id and p.is_active
    ))
  order by l.id, distance_meters asc
  limit p_limit;
$$;

create type product_search_result as (
  product_id uuid,
  variant_id uuid,
  product_name text,
  variant_name text,
  unit product_unit,
  organization_id uuid,
  organization_name text,
  organization_slug text,
  location_id uuid,
  location_name text,
  location_slug text,
  amount_minor int,
  currency_code char(3),
  stock_qty numeric,
  is_available boolean,
  distance_meters double precision
);

create function search_products_nearby(
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
    and (p_query is null or p.name ilike '%' || p_query || '%' or similarity(p.name, p_query) > 0.2)
    and (p_category_id is null or p.category_id = p_category_id)
  order by distance_meters asc
  limit p_limit;
$$;

create type service_search_result as (
  service_id uuid,
  service_name text,
  visit_charge_minor int,
  currency_code char(3),
  organization_id uuid,
  organization_name text,
  organization_slug text,
  location_id uuid,
  location_name text,
  location_slug text,
  distance_meters double precision
);

create function search_services_nearby(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters double precision default 8000,
  p_query text default null,
  p_category_id uuid default null,
  p_limit int default 30
) returns setof service_search_result
language sql stable as $$
  select
    s.id, s.name, s.visit_charge_minor, s.currency_code,
    s.organization_id, o.name, o.slug,
    l.id, l.name, l.slug,
    st_distance(l.geom, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_meters
  from services s
  join organizations o on o.id = s.organization_id
  join locations l on l.organization_id = s.organization_id
  where s.is_active
    and s.deleted_at is null
    and l.status = 'active'
    and o.status = 'active'
    and l.geom is not null
    and st_dwithin(l.geom, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_meters)
    and (p_query is null or s.name ilike '%' || p_query || '%' or similarity(s.name, p_query) > 0.2)
    and (p_category_id is null or s.category_id = p_category_id)
  order by distance_meters asc
  limit p_limit;
$$;
