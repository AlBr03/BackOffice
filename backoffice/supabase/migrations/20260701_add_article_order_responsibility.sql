alter table public.orders
add column if not exists article_order_responsibility text not null default 'order_manager';

alter table public.orders
drop constraint if exists orders_article_order_responsibility_check;

alter table public.orders
add constraint orders_article_order_responsibility_check
check (article_order_responsibility in ('order_manager', 'store_manager', 'not_needed'));
