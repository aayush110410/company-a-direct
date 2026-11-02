-- Company A direct ordering: core schema.
-- Money is integer paise. Times are timestamptz; business rules read them in Asia/Kolkata.

create type public.user_role as enum ('customer', 'kitchen_staff', 'outlet_manager', 'admin');
create type public.order_status as enum (
  'awaiting_payment', 'placed', 'preparing', 'ready', 'handed_to_rider', 'delivered', 'expired', 'cancelled'
);
create type public.diet as enum ('veg', 'non_veg', 'egg');
create type public.availability_status as enum ('available', 'out_of_stock', 'hidden');
create type public.outlet_kind as enum ('outlet', 'cloud_kitchen');
create type public.coupon_kind as enum ('percent', 'flat');
create type public.payment_method as enum ('upi', 'card');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'expired');
create type public.estimate_source as enum ('model', 'outlet_minimum', 'manager_override', 'fallback');
create type public.message_channel as enum ('whatsapp', 'sms');
create type public.message_purpose as enum ('transactional', 'marketing');

-- Places ---------------------------------------------------------------------

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

create table public.outlets (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id),
  name text not null,
  slug text not null unique,
  kind public.outlet_kind not null default 'outlet',
  area text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  delivery_radius_km numeric(4, 1) not null check (delivery_radius_km > 0),
  fssai_licence text not null check (fssai_licence ~ '^[0-9]{14}$'),
  min_promise_minutes integer not null default 35 check (min_promise_minutes between 10 and 120),
  capacity_slots integer not null default 4 check (capacity_slots between 1 and 20),
  is_accepting_orders boolean not null default true,
  opens_at time not null default '11:00',
  closes_at time not null default '23:59',
  created_at timestamptz not null default now()
);

-- People ---------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'customer',
  outlet_id uuid references public.outlets (id),
  full_name text not null default '',
  phone text check (phone is null or phone ~ '^\+91[6-9][0-9]{9}$'),
  marketing_opt_in boolean not null default false,
  marketing_opt_in_at timestamptz,
  created_at timestamptz not null default now(),
  -- Kitchen roles belong to exactly one outlet; customers and admins to none.
  constraint profiles_outlet_matches_role check (
    (role in ('kitchen_staff', 'outlet_manager') and outlet_id is not null)
    or (role in ('customer', 'admin') and outlet_id is null)
  )
);

-- Every new auth user gets a customer profile. Role and outlet are never taken from
-- client-supplied metadata; staff roles are granted by the service role only.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, outlet_id, full_name, marketing_opt_in, marketing_opt_in_at)
  values (
    new.id,
    'customer',
    null,
    coalesce(left(new.raw_user_meta_data ->> 'full_name', 80), ''),
    coalesce((new.raw_user_meta_data ->> 'marketing_opt_in')::boolean, false),
    case when coalesce((new.raw_user_meta_data ->> 'marketing_opt_in')::boolean, false) then now() end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Menu -----------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort integer not null default 0
);

create table public.menu_schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  days integer[] not null check (days <@ array[0, 1, 2, 3, 4, 5, 6] and cardinality(days) > 0),
  starts_at time not null,
  ends_at time not null
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id),
  name text not null,
  slug text not null unique,
  description text not null default '',
  photo_url text not null,
  photo_credit text not null default '',
  diet public.diet not null,
  spice_level smallint not null default 0 check (spice_level between 0 and 3),
  allergens text[] not null default '{}',
  base_prep_minutes integer not null check (base_prep_minutes between 1 and 90),
  schedule_id uuid references public.menu_schedules (id),
  is_active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.item_portions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.menu_items (id) on delete cascade,
  name text not null,
  prep_multiplier numeric(3, 2) not null default 1 check (prep_multiplier between 0.5 and 3),
  sort integer not null default 0
);

create table public.item_prices (
  portion_id uuid not null references public.item_portions (id) on delete cascade,
  city_id uuid not null references public.cities (id),
  price_paise integer not null check (price_paise > 0),
  primary key (portion_id, city_id)
);

create table public.addons (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.menu_items (id) on delete cascade,
  name text not null,
  price_paise integer not null check (price_paise >= 0),
  diet public.diet not null,
  sort integer not null default 0
);

-- Missing row = available. Rows are upserted, never deleted, so Realtime always sends an UPDATE.
create table public.outlet_item_availability (
  outlet_id uuid not null references public.outlets (id) on delete cascade,
  item_id uuid not null references public.menu_items (id) on delete cascade,
  status public.availability_status not null,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  primary key (outlet_id, item_id)
);

create table public.coupons (
  code text primary key check (code ~ '^[A-Z0-9]{3,16}$'),
  kind public.coupon_kind not null,
  value integer not null check (value > 0),
  min_order_paise integer not null default 0 check (min_order_paise >= 0),
  max_discount_paise integer check (max_discount_paise is null or max_discount_paise > 0),
  valid_from timestamptz not null,
  valid_to timestamptz not null,
  per_customer_limit integer not null default 1 check (per_customer_limit > 0),
  is_active boolean not null default true,
  check (valid_to > valid_from),
  check (kind <> 'percent' or value <= 100)
);

-- Orders ---------------------------------------------------------------------

create sequence public.order_number_seq start 778200;

create table public.orders (
  id text primary key default ('WEB-' || nextval('public.order_number_seq')),
  customer_id uuid not null references public.profiles (id),
  outlet_id uuid not null references public.outlets (id),
  status public.order_status not null default 'awaiting_payment',
  subtotal_paise integer not null check (subtotal_paise > 0),
  discount_paise integer not null default 0 check (discount_paise >= 0),
  total_paise integer not null check (total_paise >= 0),
  gst_paise integer not null check (gst_paise >= 0),
  coupon_code text references public.coupons (code),
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'pending',
  distance_km numeric(5, 2) not null,
  travel_minutes integer not null check (travel_minutes between 0 and 120),
  placed_at timestamptz not null default now(),
  paid_at timestamptz,
  promised_at timestamptz not null,
  ready_by timestamptz not null,
  preparing_at timestamptz,
  ready_at timestamptz,
  handed_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  late_alerted_at timestamptz,
  revised_eta timestamptz,
  check (total_paise = subtotal_paise - discount_paise)
);

create index orders_outlet_status_idx on public.orders (outlet_id, status);
create index orders_customer_placed_idx on public.orders (customer_id, placed_at desc);
create index orders_status_promised_idx on public.orders (status, promised_at);

-- Personal data lives apart from `orders` so it is never in the Realtime-published table
-- and only the customer who placed the order can read it (DPDP Act 2023).
create table public.order_contacts (
  order_id text primary key references public.orders (id) on delete cascade,
  customer_phone text not null check (customer_phone ~ '^\+91[6-9][0-9]{9}$'),
  delivery_address text not null check (char_length(delivery_address) between 10 and 200)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders (id) on delete cascade,
  item_id uuid not null references public.menu_items (id),
  portion_id uuid not null references public.item_portions (id),
  name_snapshot text not null,
  portion_snapshot text not null,
  qty integer not null check (qty between 1 and 20),
  unit_price_paise integer not null check (unit_price_paise > 0),
  base_prep_minutes integer not null,
  prep_multiplier numeric(3, 2) not null,
  addons jsonb not null default '[]'
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id text not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  actor_id uuid,
  at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique references public.orders (id) on delete cascade,
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  amount_paise integer not null check (amount_paise >= 0),
  provider_ref text not null default ('mock_' || replace(gen_random_uuid()::text, '-', '')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prep-time model ------------------------------------------------------------

create table public.prep_models (
  version text primary key,
  coefficients jsonb not null,
  residual_p50 double precision not null,
  residual_p80 double precision not null,
  feature_ranges jsonb not null,
  train_n integer not null,
  mae double precision not null,
  baseline_mean_mae double precision not null,
  baseline_rule_mae double precision not null,
  outlet_train_counts jsonb not null default '{}',
  trained_at timestamptz not null,
  is_active boolean not null default false
);
create unique index prep_models_one_active on public.prep_models (is_active) where is_active;

create table public.prep_estimates (
  order_id text primary key references public.orders (id) on delete cascade,
  model_version text references public.prep_models (version),
  features jsonb not null,
  predicted_minutes integer not null,
  p80_minutes integer not null,
  confidence text not null check (confidence in ('normal', 'low')),
  outlet_min_minutes integer not null,
  source public.estimate_source not null,
  promised_at timestamptz not null,
  override_reason text,
  overridden_by uuid,
  actual_minutes integer,
  created_at timestamptz not null default now()
);

-- Alerts and mocked messages -------------------------------------------------

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references public.outlets (id),
  order_id text not null references public.orders (id) on delete cascade,
  kind text not null check (kind in ('late')),
  message text not null,
  created_at timestamptz not null default now(),
  acknowledged_by uuid,
  acknowledged_at timestamptz
);
create index alerts_outlet_open_idx on public.alerts (outlet_id) where acknowledged_at is null;

-- WhatsApp / SMS are mocked: messages are written here instead of being sent.
create table public.outbox_messages (
  id uuid primary key default gen_random_uuid(),
  channel public.message_channel not null,
  to_phone text not null,
  purpose public.message_purpose not null,
  template text not null,
  body text not null,
  order_id text references public.orders (id) on delete set null,
  created_at timestamptz not null default now()
);
create index outbox_created_idx on public.outbox_messages (created_at desc);
