begin;

-- Reserve existing numbers while preventing concurrent order inserts.
lock table public.orders in share row exclusive mode;

create sequence if not exists app_private.order_number_sequence
  as integer minvalue 100000 maxvalue 999999 start with 100000 no cycle;
revoke all on sequence app_private.order_number_sequence from public, anon, authenticated;

-- Reapplication never resets numbering; existing six-digit references are reserved.
select pg_catalog.setval('app_private.order_number_sequence'::regclass,
  greatest(
    (select last_value from app_private.order_number_sequence),
    coalesce((select max(order_number::integer) from public.orders
      where order_number ~ '^[1-9][0-9]{5}$'), 100000)
  ), true);

create unique index if not exists orders_six_digit_number_unique
  on public.orders (order_number)
  where order_number ~ '^[0-9]{6}$';

create or replace function app_private.assign_order_number()
returns trigger language plpgsql security definer
set search_path = pg_catalog as $$
begin
  -- Includes inserts from older browser tabs still supplying timestamp numbers.
  new.order_number := pg_catalog.nextval('app_private.order_number_sequence'::regclass)::text;
  return new;
exception when sequence_generator_limit_exceeded then
  raise exception 'Alle zescijferige ordernummers zijn gebruikt. Neem contact op met hoofdkantoor.'
    using errcode = '54000';
end;
$$;
revoke all on function app_private.assign_order_number() from public, anon, authenticated;

drop trigger if exists orders_assign_order_number on public.orders;
create trigger orders_assign_order_number before insert on public.orders
for each row execute function app_private.assign_order_number();

-- Historical order numbers, UUIDs and tracking tokens remain untouched.
commit;
