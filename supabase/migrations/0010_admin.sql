-- =============================================================================
-- 0010_admin.sql — Phase 9: the admin console gets read/write access.
--
-- Every policy here follows the same shape as the rest of the schema:
-- `is_platform_admin()` gates it, so "can an admin see/change this" is one
-- function call, not a scattered set of service-role escape hatches. User
-- suspension is the one exception — Supabase Auth's own ban mechanism, not
-- a database row, so it's a service-role call from a trusted admin route
-- (see suspendUser()/reinstateUser() in the app), audited like every other
-- service-role write.
-- =============================================================================

-- Categories: platform-wide taxonomy, no owning organization — only an
-- admin edits it (0001 only ever granted public *read*).
create policy "categories_admin_write" on categories for all using (is_platform_admin());

-- Order monitoring across every organization.
create policy "orders_admin_read" on orders for select using (is_platform_admin());
create policy "service_bookings_admin_read" on service_bookings for select using (is_platform_admin());

-- User directory for the admin console (0001 only granted self-read and
-- the narrower "staff can see a customer who ordered from them").
create policy "profiles_admin_read" on profiles for select using (is_platform_admin());

-- Suspension itself is a Supabase Auth ban (auth.users.banned_until — not a
-- table our clients can query), applied via the service-role admin API.
-- This column is a queryable cache of that state for the admin list, kept
-- in sync by the same action that calls the Auth API — it is a display
-- convenience, not the enforcement mechanism.
alter table profiles add column is_suspended boolean not null default false;

-- Review moderation: a hidden review disappears from the public shop page
-- but the row (and the merchant's reply, if any) is kept, not destroyed.
alter table reviews add column hidden boolean not null default false;

drop policy "reviews_public_read" on reviews;
create policy "reviews_public_read" on reviews for select using (not hidden or is_platform_admin());
create policy "reviews_admin_moderate" on reviews for update using (is_platform_admin());
