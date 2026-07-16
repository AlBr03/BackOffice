alter table if exists public.orders
  add column if not exists print_supplier text;
