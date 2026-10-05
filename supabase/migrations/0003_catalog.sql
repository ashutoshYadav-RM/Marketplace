-- =============================================================================
-- 0003_catalog.sql — Phase 2: products, variants, per-location pricing & stock.
--
-- Creating a product only makes sense with a variant, a price, and a stock
-- count all at once — same "atomic RPC, not N separate client writes" rule
-- as 0001/0002. Editing an existing price or stock number is a plain
-- `UPDATE` through the RLS policies already in 0001 (`prices_manager_write`,
-- `inventory_manager_write`) — no RPC needed there, RLS is enough on its own
-- once the row already exists.
-- =============================================================================

create type product_with_variant_result as (
  product products,
  variant_id uuid
);

create function create_product_with_variant(
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

  return row(v_product, v_variant_id)::product_with_variant_result;
end;
$$;

-- Adding a second (or third) variant to an existing product — same shape,
-- product already exists so no `products` insert here.
create function add_product_variant(
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
  v_variant_id uuid;
begin
  select organization_id into v_org_id from products where id = p_product_id;
  if v_org_id is null then
    raise exception 'product % not found', p_product_id;
  end if;
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

  return v_variant_id;
end;
$$;

-- Soft delete: the product disappears from customer search (is_active,
-- deleted_at) and every variant's stock is marked unavailable in the same
-- transaction, so a half-archived product can't still show as buyable.
create function archive_product(p_product_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from products where id = p_product_id;
  if v_org_id is null then
    raise exception 'product % not found', p_product_id;
  end if;
  if not is_org_member(v_org_id, array['owner','admin','manager']::member_role[]) then
    raise exception 'not authorized';
  end if;

  update products set is_active = false, deleted_at = now() where id = p_product_id;
  update inventory set is_available = false
  where variant_id in (select id from product_variants where product_id = p_product_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage: product images. Public bucket (reads never need auth — a shop
-- page is public); writes are restricted to that product's org managers by
-- convention on the object path: `<organization_id>/<product_id>/<file>`.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product_images_org_write" on storage.objects for insert to authenticated with check (
  bucket_id = 'product-images'
  and is_org_member((storage.foldername(name))[1]::uuid, array['owner','admin','manager']::member_role[])
);
create policy "product_images_org_update" on storage.objects for update to authenticated using (
  bucket_id = 'product-images'
  and is_org_member((storage.foldername(name))[1]::uuid, array['owner','admin','manager']::member_role[])
);
create policy "product_images_org_delete" on storage.objects for delete to authenticated using (
  bucket_id = 'product-images'
  and is_org_member((storage.foldername(name))[1]::uuid, array['owner','admin','manager']::member_role[])
);
