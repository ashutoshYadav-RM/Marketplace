-- =============================================================================
-- seed.sql — reference data only. Safe to re-run (upserts).
-- Local dev: `supabase db reset` runs this automatically after migrations.
-- =============================================================================

insert into countries (iso2, name, default_currency, phone_code, is_active) values
  ('IN', 'India', 'INR', '+91', true),
  ('US', 'United States', 'USD', '+1', true),
  ('GB', 'United Kingdom', 'GBP', '+44', true),
  ('AE', 'United Arab Emirates', 'AED', '+971', true),
  ('AU', 'Australia', 'AUD', '+61', true)
on conflict (iso2) do update set
  name = excluded.name,
  default_currency = excluded.default_currency,
  phone_code = excluded.phone_code,
  is_active = excluded.is_active;

-- Root categories — `slug` is the stable key; display copy lives in
-- messages/*.json (category.<slug>) so it translates without a migration.
insert into categories (slug, name, type, icon, sort_order) values
  ('grocery', 'Grocery', 'product', 'shopping-basket', 10),
  ('milk-dairy', 'Milk & Dairy', 'product', 'milk', 20),
  ('food', 'Food', 'product', 'utensils', 30),
  ('bakery', 'Bakery', 'product', 'croissant', 40),
  ('pharmacy', 'Pharmacy', 'product', 'pill', 50),
  ('electronics', 'Electronics', 'product', 'cpu', 60),
  ('mobile-accessories', 'Mobile Accessories', 'product', 'smartphone', 70),
  ('furniture', 'Furniture', 'product', 'armchair', 80),
  ('appliances', 'Appliances', 'product', 'washing-machine', 90),
  ('hardware', 'Hardware', 'product', 'hammer', 100),
  ('stationery', 'Stationery', 'product', 'pencil', 110),
  ('fashion', 'Fashion', 'product', 'shirt', 120),
  ('beauty', 'Beauty', 'product', 'sparkles', 130),
  ('household', 'Household', 'product', 'home', 140),
  ('electrician', 'Electrician', 'service', 'plug', 200),
  ('plumber', 'Plumber', 'service', 'wrench', 210),
  ('carpenter', 'Carpenter', 'service', 'hammer', 220),
  ('ac-repair', 'AC Repair', 'service', 'snowflake', 230),
  ('appliance-repair', 'Appliance Repair', 'service', 'settings', 240),
  ('cleaning', 'Cleaning', 'service', 'spray-can', 250),
  ('painter', 'Painter', 'service', 'paintbrush', 260),
  ('pest-control', 'Pest Control', 'service', 'bug', 270),
  ('salon', 'Salon', 'service', 'scissors', 280),
  ('gym', 'Gym', 'service', 'dumbbell', 290),
  ('laundry', 'Laundry', 'service', 'shirt', 300),
  ('car-service', 'Car Service', 'service', 'car', 310),
  ('bike-service', 'Bike Service', 'service', 'bike', 320)
on conflict (slug) do update set
  name = excluded.name,
  type = excluded.type,
  icon = excluded.icon,
  sort_order = excluded.sort_order;
