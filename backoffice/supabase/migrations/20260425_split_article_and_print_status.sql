alter table public.orders
add column if not exists article_status text default 'new',
add column if not exists print_status text;

update public.orders
set article_status = case status
  when 'completed' then 'completed'
  when 'waiting_print' then 'at_location'
  when 'in_progress' then 'ordered'
  else 'new'
end
where article_status is null;

update public.orders
set print_status = case
  when has_print is not true then null
  when status = 'completed' then 'completed'
  when status = 'waiting_print' then 'logos_ordered'
  else 'new'
end
where print_status is null;

alter table public.orders
alter column article_status set default 'new';
