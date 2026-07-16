alter table if exists public.orders
  add column if not exists article_ordered_at timestamptz,
  add column if not exists logos_ordered_at timestamptz,
  add column if not exists article_order_reminder_sent_at timestamptz,
  add column if not exists logo_order_reminder_sent_at timestamptz,
  add column if not exists article_arrival_reminder_sent_at timestamptz;

update public.orders
set article_ordered_at = updated_at
where article_ordered_at is null
  and article_status = 'ordered';

update public.orders
set logos_ordered_at = updated_at
where logos_ordered_at is null
  and print_status = 'logos_ordered';
