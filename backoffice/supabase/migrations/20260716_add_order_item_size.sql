alter table if exists public.order_items
  add column if not exists size text;
