alter table public.orders
add column if not exists tracking_token text default gen_random_uuid()::text;

update public.orders
set tracking_token = gen_random_uuid()::text
where tracking_token is null or trim(tracking_token) = '';

create unique index if not exists orders_tracking_token_idx
on public.orders(tracking_token);
