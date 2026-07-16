create index if not exists orders_store_id_idx
  on public.orders (store_id);

create index if not exists orders_created_at_idx
  on public.orders (created_at desc);

create index if not exists orders_article_status_idx
  on public.orders (article_status);

create index if not exists orders_print_status_idx
  on public.orders (print_status);

create index if not exists orders_tracking_token_idx
  on public.orders (tracking_token);

create index if not exists order_items_order_id_idx
  on public.order_items (order_id);

create index if not exists order_files_order_id_idx
  on public.order_files (order_id);

create index if not exists order_activity_log_order_id_created_at_idx
  on public.order_activity_log (order_id, created_at desc);
