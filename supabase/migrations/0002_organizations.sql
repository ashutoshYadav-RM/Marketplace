-- =============================================================================
-- 0002_organizations.sql — Phase 1: merchant onboarding + admin approval.
--
-- Org creation is atomic and RPC-only (org + owner membership + first
-- location in one transaction), the same "state-changing operation is a
-- function, not a raw client write" rule as the order/booking transitions
-- in 0001. Admin approval is a SECURITY DEFINER function too, so approving
-- a shop never needs the service-role key — see blueprint §04.
-- =============================================================================

create function slugify(input text) returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(trim(input)), '[^a-z0-9]+', '-', 'g'));
$$;

-- ---------------------------------------------------------------------------
-- Merchant onboarding: create the organization, its owner membership, and
-- its first location together. A shop with no location isn't a shop yet.
-- ---------------------------------------------------------------------------
create type organization_with_location_result as (
  organization organizations,
  location_id uuid
);

create function create_organization_with_location(
  p_name text,
  p_country_id char(2),
  p_location_name text,
  p_address_line1 text,
  p_locality text,
  p_city text,
  p_region text,
  p_postal_code text,
  p_timezone text,
  p_phone text,
  p_latitude double precision default null,
  p_longitude double precision default null
) returns organization_with_location_result
language plpgsql security definer set search_path = public as $$
declare
  v_org organizations;
  v_location_id uuid;
begin
  if auth.uid() is null then
    raise exception 'must be signed in to register a shop';
  end if;

  insert into organizations (name, slug, owner_id, country_id, status)
  values (p_name, slugify(p_name) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6), auth.uid(), p_country_id, 'pending')
  returning * into v_org;

  insert into organization_members (organization_id, user_id, role)
  values (v_org.id, auth.uid(), 'owner');

  insert into locations (
    organization_id, name, slug, address_line1, locality, city, region,
    postal_code, country_id, timezone, phone, geom
  )
  values (
    v_org.id, p_location_name, 'main',
    p_address_line1, p_locality, p_city, p_region, p_postal_code, p_country_id,
    coalesce(nullif(p_timezone, ''), 'UTC'), p_phone,
    case when p_latitude is not null and p_longitude is not null
      then st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography
      else null end
  )
  returning id into v_location_id;

  return row(v_org, v_location_id)::organization_with_location_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin approval — the only writer of `organizations.status` after creation.
-- ---------------------------------------------------------------------------
create function admin_set_organization_status(p_org_id uuid, p_new_status org_status, p_note text default null)
returns organizations language plpgsql security definer set search_path = public as $$
declare
  v_org organizations;
  v_old_status org_status;
begin
  if not is_platform_admin() then
    raise exception 'not authorized';
  end if;

  select * into v_org from organizations where id = p_org_id for update;
  if not found then
    raise exception 'organization % not found', p_org_id;
  end if;
  v_old_status := v_org.status;

  update organizations set status = p_new_status where id = p_org_id returning * into v_org;

  insert into audit_logs (actor_id, organization_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(), p_org_id, 'organization_status_change', 'organization', p_org_id,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', p_new_status, 'note', p_note)
  );

  insert into notifications (user_id, type, title, body, data)
  values (
    v_org.owner_id,
    'organization_' || p_new_status,
    case p_new_status
      when 'active' then 'Your shop is approved 🎉'
      when 'rejected' then 'Your shop application needs changes'
      when 'suspended' then 'Your shop has been suspended'
      else 'Shop status updated'
    end,
    p_note,
    jsonb_build_object('organization_id', p_org_id, 'status', p_new_status)
  );

  return v_org;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: platform admins can see every organization (pending ones especially —
-- they can't approve what they can't read), and direct client inserts are
-- retired now that creation is RPC-only.
-- ---------------------------------------------------------------------------
drop policy "organizations_public_read" on organizations;
create policy "organizations_public_read" on organizations for select using (
  status = 'active'
  or owner_id = auth.uid()
  or is_org_member(id, array['owner','admin','manager','cashier','staff']::member_role[])
  or is_platform_admin()
);

drop policy "organizations_owner_insert" on organizations;
-- No replacement insert policy: organizations are created exclusively via
-- create_organization_with_location(), which is SECURITY DEFINER and
-- therefore unaffected by the absence of an INSERT policy here.
