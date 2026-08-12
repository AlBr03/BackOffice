create index if not exists orders_store_id_created_at_idx
  on public.orders (store_id, created_at desc);

create index if not exists orders_article_status_created_at_idx
  on public.orders (article_status, created_at desc);

create index if not exists orders_print_status_created_at_idx
  on public.orders (print_status, created_at desc);

create index if not exists orders_has_print_created_at_idx
  on public.orders (has_print, created_at desc);
