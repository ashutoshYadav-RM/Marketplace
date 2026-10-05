-- =============================================================================
-- 0001_init.sql
-- Hyperlocal Commerce — core schema, indexes, and row-level security.
-- Mirrors the architecture blueprint: Organization -> Location -> everything,
-- money as (amount_minor, currency_code), UTC timestamps, pluggable tax/unit.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists postgis;    -- geography(Point) + radius search
create extension if not exists pg_trgm;    -- fuzzy name search (until a dedicated search engine)

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type member_role as enum ('owner', 'admin', 'manager', 'cashier', 'staff');
create type org_status as enum ('pending', 'active', 'suspended', 'rejected');
create type location_status as enum ('active', 'inactive');
create type category_type as enum ('product', 'service', 'both');
create type product_unit as enum ('piece', 'kg', 'gram', 'litre', 'ml', 'metre', 'box', 'pack', 'set');
create type order_type as enum ('pickup', 'delivery', 'reservation', 'service');
create type order_status as enum ('placed', 'accepted', 'packing', 'ready_for_pickup', 'picked_up', 'completed', 'cancelled');
create type service_booking_status as enum ('requested', 'accepted', 'scheduled', 'arrived', 'work_started', 'completed', 'paid', 'rejected', 'cancelled', 'no_show');
create type payment_provider as enum ('cash_on_pickup', 'razorpay', 'stripe');
create type payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');
create type notification_channel as enum ('in_app', 'push', 'email', 'sms', 'whatsapp');
create type offer_type as enum ('percent', 'flat');
create type reminder_type as enum ('reorder', 'custom');

-- ---------------------------------------------------------------------------
-- Reference & identity
-- ---------------------------------------------------------------------------
create table countries (
  iso2 char(2) primary key,
  name text not null,
  default_currency char(3) not null,
  phone_code text not null,
  is_active boolean not null default true
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  phone_e164 text unique,
  phone_verified boolean not null default false,
  preferred_locale text not null default 'en',
  preferred_currency char(3),
  home_point geography(point, 4326),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Platform staff. Deliberately separate from `profiles` roles: admin access
-- is never inferred from an email domain or a client-supplied claim.
create table app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Organizations, staff, locations
-- ---------------------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references auth.users (id),
  country_id char(2) references countries (iso2),
  status org_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role member_role not null,
  location_id uuid, -- fk added after `locations` exists; null = access to all locations
  status text not null default 'active',
  invited_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references categories (id),
  slug text not null unique,
  name text not null, -- i18n key or fallback label; see messages/en.json for display copy
  icon text,
  type category_type not null default 'product',
  sort_order int not null default 0
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  address_line1 text,
  address_line2 text,
  locality text,
  city text,
  region text,
  postal_code text,
  country_id char(2) references countries (iso2),
  geom geography(point, 4326),
  timezone text not null default 'UTC', -- IANA tz, e.g. 'Asia/Kolkata'
  phone text,
  status location_status not null default 'active',
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, slug)
);

alter table organization_members
  add constraint organization_members_location_id_fkey
  foreign key (location_id) references locations (id) on delete set null;

create table location_hours (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  open_time time,
  close_time time,
  is_closed boolean not null default false
);

create table location_categories (
  location_id uuid not null references locations (id) on delete cascade,
  category_id uuid not null references categories (id) on delete cascade,
  primary key (location_id, category_id)
);

-- ---------------------------------------------------------------------------
-- Catalog, pricing, inventory
-- ---------------------------------------------------------------------------
create table tax_classes (
  id uuid primary key default gen_random_uuid(),
  country_id char(2) references countries (iso2),
  name text not null,
  rate_percent numeric(5, 2) not null default 0,
  tax_type text -- e.g. 'GST', 'VAT', 'SALES_TAX' — free text, interpreted by the tax module, not by the schema
);

create table products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  category_id uuid references categories (id),
  name text not null,
  description text,
  brand text,
  unit product_unit not null default 'piece',
  images text[] not null default '{}',
  attributes jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index products_org_idx on products (organization_id);
create index products_name_trgm_idx on products using gin (name gin_trgm_ops);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  variant_name text not null default 'Default',
  sku text,
  barcode text,
  attributes jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (product_id, variant_name)
);
create index product_variants_barcode_idx on product_variants (barcode);

create table prices (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants (id) on delete cascade,
  location_id uuid not null references locations (id) on delete cascade,
  amount_minor integer not null check (amount_minor >= 0),
  currency_code char(3) not null,
  tax_class_id uuid references tax_classes (id),
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  unique (variant_id, location_id, effective_from)
);
create index prices_variant_location_idx on prices (variant_id, location_id);

create table inventory (
  location_id uuid not null references locations (id) on delete cascade,
  variant_id uuid not null references product_variants (id) on delete cascade,
  stock_qty numeric not null default 0,
  low_stock_threshold numeric not null default 0,
  is_available boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (location_id, variant_id)
);

-- ---------------------------------------------------------------------------
-- Orders (pickup, V1) — see §05 of the blueprint for the state machine
-- ---------------------------------------------------------------------------
create sequence order_number_seq;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('ORD-' || to_char(now(), 'YYMMDD') || '-' || lpad(nextval('order_number_seq')::text, 5, '0')),
  organization_id uuid not null references organizations (id),
  location_id uuid not null references locations (id),
  customer_id uuid not null references auth.users (id),
  order_type order_type not null default 'pickup',
  status order_status not null default 'placed',
  subtotal_minor int not null default 0,
  discount_minor int not null default 0,
  tax_minor int not null default 0,
  service_fee_minor int not null default 0,
  total_minor int not null default 0,
  currency_code char(3) not null,
  pickup_code text,
  qr_token uuid not null default gen_random_uuid(),
  qr_consumed_at timestamptz,
  notes text,
  cancel_reason text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  packing_at timestamptz,
  ready_at timestamptz,
  picked_up_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz
);
create index orders_org_idx on orders (organization_id);
create index orders_location_idx on orders (location_id);
create index orders_customer_status_idx on orders (customer_id, status);
create index orders_qr_token_idx on orders (qr_token);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  variant_id uuid references product_variants (id),
  name_snapshot text not null,
  unit_price_minor int not null,
  quantity numeric not null check (quantity > 0),
  unit product_unit not null default 'piece',
  tax_minor int not null default 0,
  total_minor int not null
);
create index order_items_order_idx on order_items (order_id);

create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  from_status order_status,
  to_status order_status not null,
  changed_by uuid references auth.users (id),
  note text,
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on order_status_history (order_id);

-- ---------------------------------------------------------------------------
-- Services & bookings — see §06 of the blueprint for the state machine
-- ---------------------------------------------------------------------------
create table services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  category_id uuid references categories (id),
  name text not null,
  description text,
  visit_charge_minor int not null default 0,
  currency_code char(3),
  duration_estimate_minutes int,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index services_org_idx on services (organization_id);

create sequence booking_number_seq;

create table service_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_number text not null unique default ('SVC-' || to_char(now(), 'YYMMDD') || '-' || lpad(nextval('booking_number_seq')::text, 5, '0')),
  organization_id uuid not null references organizations (id),
  location_id uuid references locations (id),
  service_id uuid not null references services (id),
  customer_id uuid not null references auth.users (id),
  status service_booking_status not null default 'requested',
  requested_time timestamptz,
  scheduled_time timestamptz,
  description text,
  images text[] not null default '{}',
  visit_charge_minor int,
  currency_code char(3),
  cancel_reason text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  scheduled_at timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  paid_at timestamptz
);
create index service_bookings_org_idx on service_bookings (organization_id);
create index service_bookings_customer_status_idx on service_bookings (customer_id, status);

create table service_booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references service_bookings (id) on delete cascade,
  from_status service_booking_status,
  to_status service_booking_status not null,
  changed_by uuid references auth.users (id),
  note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Payments, reviews, offers, reminders, notifications, files, audit
-- ---------------------------------------------------------------------------
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders (id),
  service_booking_id uuid references service_bookings (id),
  provider payment_provider not null default 'cash_on_pickup',
  provider_reference text,
  status payment_status not null default 'pending',
  amount_minor int not null,
  currency_code char(3) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_target_chk check (order_id is not null or service_booking_id is not null)
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  location_id uuid references locations (id),
  customer_id uuid not null references auth.users (id),
  order_id uuid references orders (id),
  rating smallint not null check (rating between 1 and 5),
  comment text,
  images text[] not null default '{}',
  reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  unique (order_id)
);
create index reviews_org_idx on reviews (organization_id);

create table offers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  location_id uuid references locations (id),
  code text not null,
  type offer_type not null,
  value numeric not null,
  min_order_minor int not null default 0,
  currency_code char(3),
  valid_from timestamptz,
  valid_to timestamptz,
  usage_limit int,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table reminders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid references organizations (id),
  variant_id uuid references product_variants (id),
  type reminder_type not null default 'reorder',
  next_trigger_at timestamptz,
  frequency_days int,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}',
  channel notification_channel not null default 'in_app',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, is_read);

create table files (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null, -- 'profile' | 'organization' | 'location' | 'product' | 'review' | ...
  owner_id uuid not null,
  bucket text not null,
  path text not null,
  mime_type text,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id),
  organization_id uuid references organizations (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Geo & staff indexes
-- ---------------------------------------------------------------------------
create index locations_geom_gix on locations using gist (geom);
create index locations_org_idx on locations (organization_id);
create index organization_members_org_idx on organization_members (organization_id);
create index organization_members_user_idx on organization_members (user_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger (generic)
-- ---------------------------------------------------------------------------
create function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_organizations_updated_at before update on organizations for each row execute function set_updated_at();
create trigger trg_locations_updated_at before update on locations for each row execute function set_updated_at();
create trigger trg_products_updated_at before update on products for each row execute function set_updated_at();
create trigger trg_services_updated_at before update on services for each row execute function set_updated_at();
create trigger trg_profiles_updated_at before update on profiles for each row execute function set_updated_at();
create trigger trg_payments_updated_at before update on payments for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- auth.users -> profiles (identity is unconditional; role is context — §03)
-- ---------------------------------------------------------------------------
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, phone_e164)
  values (new.id, new.email, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS helper functions — every tenant policy resolves through these (§04)
-- ---------------------------------------------------------------------------
create function is_org_member(target_org uuid, min_roles member_role[])
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from organization_members m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any(min_roles)
  );
$$;

create function is_platform_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from app_admins a where a.user_id = auth.uid() and a.is_active
  );
$$;

-- ---------------------------------------------------------------------------
-- Order state machine — the only writer of `orders.status` (§05)
-- ---------------------------------------------------------------------------
create function transition_order_status(p_order_id uuid, p_new_status order_status, p_note text default null)
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

  -- valid forward edges (see FIG 06)
  v_valid := (v_order.status = 'placed' and p_new_status in ('accepted', 'cancelled'))
    or (v_order.status = 'accepted' and p_new_status in ('packing', 'cancelled'))
    or (v_order.status = 'packing' and p_new_status in ('ready_for_pickup', 'cancelled'))
    or (v_order.status = 'ready_for_pickup' and p_new_status = 'picked_up')
    or (v_order.status = 'picked_up' and p_new_status = 'completed');

  if not v_valid then
    raise exception 'invalid transition from % to %', v_order.status, p_new_status;
  end if;

  -- only staff (not the customer) drive the merchant-side edges; the
  -- customer may only request cancellation while still PLACED.
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

  -- in-app notification row; push/SMS/WhatsApp fan-out is a later-phase
  -- Edge Function subscribed to this table (see §12 Phase 5).
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

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- Pickup QR verification — a typed result, not a generic error (§05)
-- ---------------------------------------------------------------------------
create type pickup_verify_result as (
  ok boolean,
  reason text,
  order_id uuid
);

create function verify_and_complete_pickup(p_qr_token uuid, p_scanning_location_id uuid)
returns pickup_verify_result language plpgsql security definer set search_path = public as $$
declare
  v_order orders;
begin
  select * into v_order from orders where qr_token = p_qr_token for update;

  if not found then
    return row(false, 'not_found', null)::pickup_verify_result;
  end if;
  if v_order.location_id <> p_scanning_location_id then
    return row(false, 'wrong_shop', v_order.id)::pickup_verify_result;
  end if;
  if not is_org_member(v_order.organization_id, array['owner','admin','manager','cashier','staff']::member_role[]) then
    return row(false, 'not_authorized', v_order.id)::pickup_verify_result;
  end if;
  if v_order.qr_consumed_at is not null then
    return row(false, 'already_picked_up', v_order.id)::pickup_verify_result;
  end if;
  if v_order.status <> 'ready_for_pickup' then
    return row(false, 'not_ready', v_order.id)::pickup_verify_result;
  end if;

  update orders set qr_consumed_at = now() where id = v_order.id;
  perform transition_order_status(v_order.id, 'picked_up', 'verified via QR scan');

  return row(true, null, v_order.id)::pickup_verify_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Service booking state machine — mirrors the order function (§06)
-- ---------------------------------------------------------------------------
create function transition_booking_status(p_booking_id uuid, p_new_status service_booking_status, p_note text default null)
returns service_bookings language plpgsql security definer set search_path = public as $$
declare
  v_booking service_bookings;
  v_is_customer boolean;
  v_is_staff boolean;
  v_valid boolean := false;
begin
  select * into v_booking from service_bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking % not found', p_booking_id;
  end if;

  v_is_customer := v_booking.customer_id = auth.uid();
  v_is_staff := is_org_member(v_booking.organization_id, array['owner','admin','manager','cashier','staff']::member_role[]);

  if not (v_is_customer or v_is_staff or is_platform_admin()) then
    raise exception 'not authorized to change this booking';
  end if;

  v_valid := (v_booking.status = 'requested' and p_new_status in ('accepted','rejected','cancelled'))
    or (v_booking.status = 'accepted' and p_new_status in ('scheduled','cancelled'))
    or (v_booking.status = 'scheduled' and p_new_status in ('arrived','no_show','cancelled'))
    or (v_booking.status = 'arrived' and p_new_status = 'work_started')
    or (v_booking.status = 'work_started' and p_new_status = 'completed')
    or (v_booking.status = 'completed' and p_new_status = 'paid');

  if not v_valid then
    raise exception 'invalid transition from % to %', v_booking.status, p_new_status;
  end if;
  if p_new_status not in ('cancelled') and not (v_is_staff or is_platform_admin()) then
    raise exception 'only the service provider can advance this booking';
  end if;

  update service_bookings set
    status = p_new_status,
    cancel_reason = case when p_new_status = 'cancelled' then p_note else cancel_reason end,
    accepted_at = case when p_new_status = 'accepted' then now() else accepted_at end,
    scheduled_at = case when p_new_status = 'scheduled' then now() else scheduled_at end,
    arrived_at = case when p_new_status = 'arrived' then now() else arrived_at end,
    started_at = case when p_new_status = 'work_started' then now() else started_at end,
    completed_at = case when p_new_status = 'completed' then now() else completed_at end,
    paid_at = case when p_new_status = 'paid' then now() else paid_at end
  where id = p_booking_id
  returning * into v_booking;

  insert into service_booking_status_history (booking_id, from_status, to_status, changed_by, note)
  values (p_booking_id, v_booking.status, p_new_status, auth.uid(), p_note);

  insert into notifications (user_id, type, title, body, data)
  values (
    v_booking.customer_id,
    'booking_' || p_new_status,
    'Booking ' || v_booking.booking_number || ' — ' || p_new_status,
    null,
    jsonb_build_object('booking_id', v_booking.id, 'status', p_new_status)
  );

  return v_booking;
end;
$$;

-- =============================================================================
-- Row-level security
-- =============================================================================
alter table countries enable row level security;
alter table profiles enable row level security;
alter table app_admins enable row level security;
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table categories enable row level security;
alter table locations enable row level security;
alter table location_hours enable row level security;
alter table location_categories enable row level security;
alter table tax_classes enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table prices enable row level security;
alter table inventory enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_history enable row level security;
alter table services enable row level security;
alter table service_bookings enable row level security;
alter table service_booking_status_history enable row level security;
alter table payments enable row level security;
alter table reviews enable row level security;
alter table offers enable row level security;
alter table reminders enable row level security;
alter table notifications enable row level security;
alter table files enable row level security;
alter table audit_logs enable row level security;

-- reference data: public read, no client writes
create policy "countries_public_read" on countries for select using (true);
create policy "categories_public_read" on categories for select using (true);
create policy "tax_classes_public_read" on tax_classes for select using (true);

-- profiles: strictly self
create policy "profiles_self_select" on profiles for select using (id = auth.uid());
create policy "profiles_self_update" on profiles for update using (id = auth.uid());

-- app_admins: a user may check only their own admin status (mirrors the
-- profiles pattern) — never another user's, and never a list of all admins.
create policy "app_admins_self_read" on app_admins for select using (user_id = auth.uid());

-- organizations
create policy "organizations_public_read" on organizations for select using (status = 'active' or owner_id = auth.uid() or is_org_member(id, array['owner','admin','manager','cashier','staff']::member_role[]));
create policy "organizations_owner_insert" on organizations for insert with check (owner_id = auth.uid());
create policy "organizations_staff_update" on organizations for update using (is_org_member(id, array['owner','admin']::member_role[]));

-- organization_members
create policy "org_members_self_or_staff_read" on organization_members for select using (user_id = auth.uid() or is_org_member(organization_id, array['owner','admin','manager','cashier','staff']::member_role[]));
create policy "org_members_admin_write" on organization_members for all using (is_org_member(organization_id, array['owner','admin']::member_role[]));

-- locations
create policy "locations_public_read" on locations for select using (status = 'active' or is_org_member(organization_id, array['owner','admin','manager','cashier','staff']::member_role[]));
create policy "locations_manager_write" on locations for all using (is_org_member(organization_id, array['owner','admin','manager']::member_role[]));

create policy "location_hours_public_read" on location_hours for select using (true);
create policy "location_hours_manager_write" on location_hours for all using (
  is_org_member((select organization_id from locations where id = location_id), array['owner','admin','manager']::member_role[])
);

create policy "location_categories_public_read" on location_categories for select using (true);
create policy "location_categories_manager_write" on location_categories for all using (
  is_org_member((select organization_id from locations where id = location_id), array['owner','admin','manager']::member_role[])
);

-- catalog
create policy "products_public_read" on products for select using (is_active or is_org_member(organization_id, array['owner','admin','manager','cashier','staff']::member_role[]));
create policy "products_manager_write" on products for all using (is_org_member(organization_id, array['owner','admin','manager']::member_role[]));

create policy "product_variants_public_read" on product_variants for select using (
  exists (select 1 from products p where p.id = product_id and (p.is_active or is_org_member(p.organization_id, array['owner','admin','manager','cashier','staff']::member_role[])))
);
create policy "product_variants_manager_write" on product_variants for all using (
  is_org_member((select organization_id from products where id = product_id), array['owner','admin','manager']::member_role[])
);

create policy "prices_public_read" on prices for select using (true);
create policy "prices_manager_write" on prices for all using (
  is_org_member((select organization_id from locations where id = location_id), array['owner','admin','manager']::member_role[])
);

create policy "inventory_public_read" on inventory for select using (true);
create policy "inventory_manager_write" on inventory for all using (
  is_org_member((select organization_id from locations where id = location_id), array['owner','admin','manager']::member_role[])
);

-- orders — status is never updated directly by a client policy;
-- see transition_order_status() and verify_and_complete_pickup() above.
create policy "orders_customer_read" on orders for select using (customer_id = auth.uid());
create policy "orders_staff_read" on orders for select using (is_org_member(organization_id, array['owner','admin','manager','cashier','staff']::member_role[]));
create policy "orders_customer_insert" on orders for insert with check (customer_id = auth.uid());

create policy "order_items_read" on order_items for select using (
  exists (select 1 from orders o where o.id = order_id and (o.customer_id = auth.uid() or is_org_member(o.organization_id, array['owner','admin','manager','cashier','staff']::member_role[])))
);
create policy "order_items_customer_insert" on order_items for insert with check (
  exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid() and o.status = 'placed')
);

create policy "order_status_history_read" on order_status_history for select using (
  exists (select 1 from orders o where o.id = order_id and (o.customer_id = auth.uid() or is_org_member(o.organization_id, array['owner','admin','manager','cashier','staff']::member_role[])))
);

-- services & bookings
create policy "services_public_read" on services for select using (is_active or is_org_member(organization_id, array['owner','admin','manager','cashier','staff']::member_role[]));
create policy "services_manager_write" on services for all using (is_org_member(organization_id, array['owner','admin','manager']::member_role[]));

create policy "service_bookings_customer_read" on service_bookings for select using (customer_id = auth.uid());
create policy "service_bookings_staff_read" on service_bookings for select using (is_org_member(organization_id, array['owner','admin','manager','cashier','staff']::member_role[]));
create policy "service_bookings_customer_insert" on service_bookings for insert with check (customer_id = auth.uid());

create policy "service_booking_status_history_read" on service_booking_status_history for select using (
  exists (select 1 from service_bookings b where b.id = booking_id and (b.customer_id = auth.uid() or is_org_member(b.organization_id, array['owner','admin','manager','cashier','staff']::member_role[])))
);

-- payments — read only; writes are Edge-Function/service-role only (provider webhooks)
create policy "payments_read" on payments for select using (
  exists (select 1 from orders o where o.id = order_id and (o.customer_id = auth.uid() or is_org_member(o.organization_id, array['owner','admin','manager']::member_role[])))
  or exists (select 1 from service_bookings b where b.id = service_booking_id and (b.customer_id = auth.uid() or is_org_member(b.organization_id, array['owner','admin','manager']::member_role[])))
);

-- reviews
create policy "reviews_public_read" on reviews for select using (true);
create policy "reviews_customer_insert" on reviews for insert with check (
  customer_id = auth.uid()
  and exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid() and o.status = 'completed')
);
create policy "reviews_customer_update" on reviews for update using (customer_id = auth.uid());
create policy "reviews_staff_reply" on reviews for update using (is_org_member(organization_id, array['owner','admin','manager']::member_role[]));

-- offers
create policy "offers_public_read" on offers for select using (is_active);
create policy "offers_manager_write" on offers for all using (is_org_member(organization_id, array['owner','admin','manager']::member_role[]));

-- reminders & notifications — strictly self
create policy "reminders_self" on reminders for all using (customer_id = auth.uid());
create policy "notifications_self_read" on notifications for select using (user_id = auth.uid());
create policy "notifications_self_update" on notifications for update using (user_id = auth.uid());

-- files — self-owned profile uploads via client; org-scoped uploads go
-- through a service-layer RPC that checks membership (added when Storage
-- buckets are wired in Phase 2), so no broad organization policy here yet.
create policy "files_owner_read" on files for select using (owner_type = 'profile' and owner_id = auth.uid());
create policy "files_owner_insert" on files for insert with check (owner_type = 'profile' and owner_id = auth.uid());

-- audit_logs — no client policies; service role + is_platform_admin() reads only
create policy "audit_logs_admin_read" on audit_logs for select using (is_platform_admin());
