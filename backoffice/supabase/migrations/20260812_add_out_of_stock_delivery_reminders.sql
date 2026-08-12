alter table if exists public.orders
  add column if not exists article_out_of_stock boolean not null default false,
  add column if not exists expected_article_delivery_date date,
  add column if not exists article_delivery_reminder_days_before integer not null default 2,
  add column if not exists article_delivery_reminder_sent_at timestamptz;

create index if not exists orders_expected_article_delivery_date_idx
  on public.orders (expected_article_delivery_date)
  where article_out_of_stock = true
    and article_delivery_reminder_sent_at is null;
