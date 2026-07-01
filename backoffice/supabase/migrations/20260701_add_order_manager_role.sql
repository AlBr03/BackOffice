alter table if exists public.profiles
drop constraint if exists profiles_role_check;

alter table if exists public.profiles
add constraint profiles_role_check
check (role in (
  'pending',
  'store',
  'store_manager',
  'office',
  'order_manager',
  'print',
  'admin'
));

create or replace function app_private.is_office_like_user()
returns boolean
language sql
stable
security definer
set search_path = app_private, public
as $$
  select coalesce(app_private.current_user_role() in ('office', 'order_manager', 'admin'), false)
$$;

do $$
begin
  if exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'is_office_like_user'
  ) then
    execute $function$
      create or replace function public.is_office_like_user()
      returns boolean
      language sql
      stable
      security definer
      set search_path = public
      as $body$
        select coalesce(public.current_user_role() in ('office', 'order_manager', 'admin'), false)
      $body$
    $function$;
  end if;
end;
$$;
