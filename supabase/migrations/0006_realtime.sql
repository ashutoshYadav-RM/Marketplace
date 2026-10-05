-- =============================================================================
-- 0006_realtime.sql — Phase 5: live order status + pickup QR verification.
--
-- Realtime here is Postgres Changes over `supabase_realtime`, authorized by
-- the same RLS policies as everything else — a customer's subscription to
-- `orders` can only ever emit rows `orders_customer_read` already lets them
-- select, so adding a table to the publication does not widen access.
-- =============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table orders;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;

-- The customer's shown either a QR (encoding qr_token) or a short
-- human-readable pickup_code (see order detail page) — staff may scan or
-- type. Same checks, same outcome as verify_and_complete_pickup(); this
-- just resolves the code to a token first.
create function verify_pickup_by_code(p_pickup_code text, p_scanning_location_id uuid)
returns pickup_verify_result
language plpgsql security definer set search_path = public as $$
declare
  v_token uuid;
begin
  select qr_token into v_token from orders
    where pickup_code = upper(trim(p_pickup_code))
      and location_id = p_scanning_location_id
    order by created_at desc
    limit 1;

  if v_token is null then
    return row(false, 'not_found', null)::pickup_verify_result;
  end if;

  return verify_and_complete_pickup(v_token, p_scanning_location_id);
end;
$$;
