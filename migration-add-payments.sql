-- ============================================================
-- CUE8 — Migration: Add payment columns + fix bookings table
-- Run this in Supabase → SQL Editor → New Query → Run
-- ============================================================

-- Add missing payment columns (safe — won't break existing data)
alter table bookings
  add column if not exists amount           integer not null default 0,
  add column if not exists payment_method   text not null default 'cash',
  add column if not exists payment_status   text not null default 'pending',
  add column if not exists razorpay_id      text;

-- Fix check constraints (drop old ones first if they exist)
alter table bookings drop constraint if exists bookings_payment_method_check;
alter table bookings drop constraint if exists bookings_payment_status_check;

alter table bookings
  add constraint bookings_payment_method_check check (payment_method in ('online', 'cash')),
  add constraint bookings_payment_status_check check (payment_status in ('paid', 'pending', 'failed'));

-- Confirm it worked
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'bookings'
order by ordinal_position;
