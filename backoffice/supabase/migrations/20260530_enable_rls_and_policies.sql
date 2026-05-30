-- RLS policies for the backoffice app.

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() limit 1
$$;

create or replace function public.current_user_store_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select store_id from public.profiles where id = auth.uid() limit 1
$$;

create or replace function public.is_office_like_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('office', 'admin'), false)
$$;

create or replace function public.is_store_like_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('store', 'store_manager'), false)
$$;

create or replace function public.can_select_order(order_store_id uuid, order_has_print boolean)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_office_like_user()
    or (public.current_user_role() = 'print' and coalesce(order_has_print, false))
    or (public.is_store_like_user() and public.current_user_store_id() = order_store_id)
$$;

create or replace function public.can_manage_order(order_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_office_like_user()
    or (public.is_store_like_user() and public.current_user_store_id() = order_store_id)
$$;

create or replace function public.storage_order_id(file_path text)
returns uuid
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  first_segment text;
begin
  first_segment := (storage.foldername(file_path))[1];
  return first_segment::uuid;
exception
  when others then
    return null;
end;
$$;

alter table if exists public.profiles enable row level security;
alter table if exists public.stores enable row level security;
alter table if exists public.orders enable row level security;
alter table if exists public.order_items enable row level security;
alter table if exists public.order_files enable row level security;
alter table if exists public.order_activity_log enable row level security;

drop policy if exists "profiles_select_own_or_office" on public.profiles;
create policy "profiles_select_own_or_office" on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_office_like_user());

drop policy if exists "profiles_office_insert" on public.profiles;
create policy "profiles_office_insert" on public.profiles
for insert to authenticated
with check (public.is_office_like_user());

drop policy if exists "profiles_office_update" on public.profiles;
create policy "profiles_office_update" on public.profiles
for update to authenticated
using (public.is_office_like_user())
with check (public.is_office_like_user());

drop policy if exists "profiles_office_delete" on public.profiles;
create policy "profiles_office_delete" on public.profiles
for delete to authenticated
using (public.is_office_like_user());

drop policy if exists "stores_authenticated_select" on public.stores;
create policy "stores_authenticated_select" on public.stores
for select to authenticated
using (true);

drop policy if exists "stores_office_insert" on public.stores;
create policy "stores_office_insert" on public.stores
for insert to authenticated
with check (public.is_office_like_user());

drop policy if exists "stores_office_update" on public.stores;
create policy "stores_office_update" on public.stores
for update to authenticated
using (public.is_office_like_user())
with check (public.is_office_like_user());

drop policy if exists "stores_office_delete" on public.stores;
create policy "stores_office_delete" on public.stores
for delete to authenticated
using (public.is_office_like_user());

drop policy if exists "orders_role_select" on public.orders;
create policy "orders_role_select" on public.orders
for select to authenticated
using (public.can_select_order(store_id, has_print));

drop policy if exists "orders_role_insert" on public.orders;
create policy "orders_role_insert" on public.orders
for insert to authenticated
with check (public.can_manage_order(store_id));

drop policy if exists "orders_role_update" on public.orders;
create policy "orders_role_update" on public.orders
for update to authenticated
using (public.can_manage_order(store_id))
with check (public.can_manage_order(store_id));

drop policy if exists "orders_office_delete" on public.orders;
create policy "orders_office_delete" on public.orders
for delete to authenticated
using (public.is_office_like_user());

drop policy if exists "order_items_role_select" on public.order_items;
create policy "order_items_role_select" on public.order_items
for select to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and public.can_select_order(orders.store_id, orders.has_print)
  )
);

drop policy if exists "order_items_role_insert" on public.order_items;
create policy "order_items_role_insert" on public.order_items
for insert to authenticated
with check (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and public.can_manage_order(orders.store_id)
  )
);

drop policy if exists "order_items_role_update" on public.order_items;
create policy "order_items_role_update" on public.order_items
for update to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and public.can_manage_order(orders.store_id)
  )
)
with check (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and public.can_manage_order(orders.store_id)
  )
);

drop policy if exists "order_items_role_delete" on public.order_items;
create policy "order_items_role_delete" on public.order_items
for delete to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and public.can_manage_order(orders.store_id)
  )
);

drop policy if exists "order_files_role_select" on public.order_files;
create policy "order_files_role_select" on public.order_files
for select to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = order_files.order_id
      and public.can_select_order(orders.store_id, orders.has_print)
  )
);

drop policy if exists "order_files_role_insert" on public.order_files;
create policy "order_files_role_insert" on public.order_files
for insert to authenticated
with check (
  exists (
    select 1 from public.orders
    where orders.id = order_files.order_id
      and public.can_select_order(orders.store_id, orders.has_print)
  )
);

drop policy if exists "order_files_role_update" on public.order_files;
create policy "order_files_role_update" on public.order_files
for update to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = order_files.order_id
      and public.can_select_order(orders.store_id, orders.has_print)
  )
)
with check (
  exists (
    select 1 from public.orders
    where orders.id = order_files.order_id
      and public.can_select_order(orders.store_id, orders.has_print)
  )
);

drop policy if exists "order_files_office_delete" on public.order_files;
create policy "order_files_office_delete" on public.order_files
for delete to authenticated
using (public.is_office_like_user());

drop policy if exists "order_activity_role_select" on public.order_activity_log;
create policy "order_activity_role_select" on public.order_activity_log
for select to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = order_activity_log.order_id
      and public.can_select_order(orders.store_id, orders.has_print)
  )
);

drop policy if exists "order_activity_role_insert" on public.order_activity_log;
create policy "order_activity_role_insert" on public.order_activity_log
for insert to authenticated
with check (
  exists (
    select 1 from public.orders
    where orders.id = order_activity_log.order_id
      and public.can_select_order(orders.store_id, orders.has_print)
  )
);

drop policy if exists "order_activity_office_update" on public.order_activity_log;
create policy "order_activity_office_update" on public.order_activity_log
for update to authenticated
using (public.is_office_like_user())
with check (public.is_office_like_user());

drop policy if exists "order_activity_office_delete" on public.order_activity_log;
create policy "order_activity_office_delete" on public.order_activity_log
for delete to authenticated
using (public.is_office_like_user());

drop policy if exists "print_files_authenticated_select" on storage.objects;
create policy "print_files_authenticated_select" on storage.objects
for select to authenticated
using (
  bucket_id = 'print-files'
  and exists (
    select 1
    from public.order_files
    join public.orders on orders.id = order_files.order_id
    where order_files.file_path = storage.objects.name
      and public.can_select_order(orders.store_id, orders.has_print)
  )
);

drop policy if exists "print_files_authenticated_insert" on storage.objects;
create policy "print_files_authenticated_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'print-files'
  and exists (
    select 1
    from public.orders
    where orders.id = public.storage_order_id(storage.objects.name)
      and public.can_select_order(orders.store_id, orders.has_print)
  )
);

drop policy if exists "print_files_office_delete" on storage.objects;
create policy "print_files_office_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'print-files'
  and public.is_office_like_user()
);
