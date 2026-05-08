-- ============================================================
-- CUE8 Clone — Supabase SQL Schema (v2 with Payments)
-- Run this FULL file in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. TABLES
create table if not exists tables (
  id               serial primary key,
  name             text not null,
  type             text not null check (type in ('Pool', 'Mini Snooker')),
  price_per_hour   integer not null default 150,
  is_available     boolean not null default true,
  created_at       timestamptz default now()
);

-- 2. BOOKINGS (with payment fields)
create table if not exists bookings (
  id               serial primary key,
  table_id         integer references tables(id) on delete cascade,
  customer_name    text not null,
  phone            text not null,
  date             text not null,
  start_time       text not null,
  duration_minutes integer not null,
  amount           integer not null default 0,
  payment_method   text not null default 'cash' check (payment_method in ('online', 'cash')),
  payment_status   text not null default 'pending' check (payment_status in ('paid', 'pending', 'failed')),
  razorpay_id      text,
  status           text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at       timestamptz default now()
);

-- 3. LEADERBOARD
create table if not exists leaderboard (
  id           serial primary key,
  player_name  text not null,
  hours_played numeric(6,1) not null default 0,
  tier         text not null default 'silver' check (tier in ('gold', 'silver', 'bronze')),
  updated_at   timestamptz default now()
);

-- 4. ADMIN SETTINGS
create table if not exists admin_settings (
  id         serial primary key,
  key        text unique not null,
  value      text not null default '',
  updated_at timestamptz default now()
);

-- ============================================================
-- SEED DATA
-- ============================================================

insert into tables (name, type, price_per_hour, is_available) values
  ('ASGUARD', 'Mini Snooker', 250, false),
  ('TITAN',   'Mini Snooker', 250, false),
  ('NYRO',    'Pool',         150, false),
  ('ORION',   'Pool',         150, false),
  ('VELAR',   'Pool',         150, false)
on conflict do nothing;

insert into leaderboard (player_name, hours_played, tier) values
  ('Divy Patel',    37.0, 'gold'),
  ('Vraj Kumar',    30.5, 'silver'),
  ('Dhruv Chavda',  29.5, 'silver'),
  ('Mahir',         28.0, 'silver'),
  ('Patel Vraj',    25.5, 'silver'),
  ('Janak Thakkar', 23.0, 'silver'),
  ('Prem',          21.5, 'silver'),
  ('Prem Bhai',     21.0, 'silver'),
  ('Dhruv',         21.0, 'silver'),
  ('Tirth Bhai',    17.5, 'bronze')
on conflict do nothing;

insert into admin_settings (key, value) values
  ('clubName', 'CUE8'),
  ('hours',    '12 PM – 12 AM'),
  ('phone',    '+91 XXXXX XXXXX'),
  ('address',  'CUE Pool & Snooker Club, Nagpur')
on conflict (key) do nothing;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table tables          enable row level security;
alter table bookings        enable row level security;
alter table leaderboard     enable row level security;
alter table admin_settings  enable row level security;

drop policy if exists "Public read tables"       on tables;
drop policy if exists "Public read leaderboard"  on leaderboard;
drop policy if exists "Public read settings"     on admin_settings;
drop policy if exists "Public insert bookings"   on bookings;
drop policy if exists "Public read bookings"     on bookings;
drop policy if exists "Anon full tables"         on tables;
drop policy if exists "Anon full bookings"       on bookings;
drop policy if exists "Anon full leaderboard"    on leaderboard;
drop policy if exists "Anon full settings"       on admin_settings;

create policy "Public read tables"      on tables         for select using (true);
create policy "Public read leaderboard" on leaderboard    for select using (true);
create policy "Public read settings"    on admin_settings for select using (true);
create policy "Public insert bookings"  on bookings       for insert with check (true);
create policy "Public read bookings"    on bookings       for select using (true);
create policy "Anon full tables"        on tables         for all using (true) with check (true);
create policy "Anon full bookings"      on bookings       for all using (true) with check (true);
create policy "Anon full leaderboard"   on leaderboard    for all using (true) with check (true);
create policy "Anon full settings"      on admin_settings for all using (true) with check (true);
