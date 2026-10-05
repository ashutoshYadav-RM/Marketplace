-- =============================================================================
-- 0008_services.sql — Phase 7: service listings + the booking state machine.
--
-- Services themselves are simple enough that a direct RLS-covered write is
-- enough (`services_manager_write` from 0001) — one row, no cross-table
-- atomicity to protect, same reasoning as editing a product's price. A
-- booking is different: `visit_charge_minor`/`currency_code` must be
-- snapshotted from `services` server-side, never trusted from the client,
-- so creating one gets the same RPC treatment as an order.
-- =============================================================================

create function request_service_booking(
  p_organization_id uuid,
  p_location_id uuid,
  p_service_id uuid,
  p_requested_time timestamptz,
  p_description text default null,
  p_images text[] default '{}'
) returns service_bookings
language plpgsql security definer set search_path = public as $$
declare
  v_customer uuid := auth.uid();
  v_service services;
  v_booking service_bookings;
begin
  if v_customer is null then
    raise exception 'must be signed in to book a service';
  end if;

  select * into v_service from services
    where id = p_service_id and organization_id = p_organization_id and is_active and deleted_at is null;
  if not found then
    raise exception 'service no longer available';
  end if;

  insert into service_bookings (
    organization_id, location_id, service_id, customer_id, status,
    requested_time, description, images, visit_charge_minor, currency_code
  )
  values (
    p_organization_id, p_location_id, p_service_id, v_customer, 'requested',
    p_requested_time, nullif(p_description, ''), coalesce(p_images, '{}'),
    v_service.visit_charge_minor, v_service.currency_code
  )
  returning * into v_booking;

  insert into service_booking_status_history (booking_id, from_status, to_status, changed_by)
  values (v_booking.id, null, 'requested', v_customer);

  insert into notifications (user_id, type, title, body, data)
  values (
    v_customer, 'booking_requested', 'Booking requested',
    v_service.name || ' request sent to ' || (select name from organizations where id = p_organization_id) || '.',
    jsonb_build_object('booking_id', v_booking.id)
  );

  return v_booking;
end;
$$;

drop policy "service_bookings_customer_insert" on service_bookings;

-- Scheduling is the one transition that also carries new information (the
-- agreed appointment time), not just a status change — extend the existing
-- function rather than add a second write path for the same row.
create or replace function transition_booking_status(
  p_booking_id uuid,
  p_new_status service_booking_status,
  p_note text default null,
  p_scheduled_time timestamptz default null
)
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
    scheduled_time = case when p_new_status = 'scheduled' and p_scheduled_time is not null then p_scheduled_time else scheduled_time end,
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

-- Live status for the customer's booking page, same authorization model as
-- orders (see 0006_realtime.sql).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'service_bookings'
  ) then
    alter publication supabase_realtime add table service_bookings;
  end if;
end $$;
