alter table if exists public.profiles
drop constraint if exists profiles_role_check;

alter table if exists public.profiles
add constraint profiles_role_check
check (role in ('pending', 'store', 'store_manager', 'office', 'print', 'admin'));
