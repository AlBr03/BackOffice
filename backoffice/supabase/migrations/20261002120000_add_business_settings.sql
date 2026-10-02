begin;

create table if not exists public.business_settings (
  id integer primary key check (id = 1),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  version integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.business_settings (id) values (1) on conflict (id) do nothing;
alter table public.business_settings enable row level security;
revoke all on public.business_settings from anon;
grant select (id, settings, version) on public.business_settings to authenticated;
grant update on public.business_settings to authenticated;
revoke insert, delete on public.business_settings from authenticated;
drop policy if exists business_settings_read on public.business_settings;
create policy business_settings_read on public.business_settings for select to authenticated
using (app_private.current_user_role() in ('store', 'store_manager', 'office', 'order_manager', 'print', 'admin'));
drop policy if exists business_settings_manage on public.business_settings;
create policy business_settings_manage on public.business_settings for update to authenticated
using (app_private.current_user_role() in ('admin', 'office'))
with check (app_private.current_user_role() in ('admin', 'office'));

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null check (jsonb_typeof(preferences) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.user_preferences enable row level security;
revoke all on public.user_preferences from anon;
grant select, insert, update on public.user_preferences to authenticated;
drop policy if exists user_preferences_own on public.user_preferences;
create policy user_preferences_own on public.user_preferences for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.settings_history (
  id bigint generated always as identity primary key,
  setting_type text not null check (setting_type in ('business', 'dropdowns')),
  version integer not null,
  actor uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  previous_snapshot jsonb not null,
  snapshot jsonb not null
);
alter table public.settings_history enable row level security;
create index if not exists settings_history_type_time_idx on public.settings_history (setting_type, changed_at desc);
revoke all on public.settings_history from anon, authenticated;
grant select on public.settings_history to authenticated;
drop policy if exists settings_history_managers on public.settings_history;
create policy settings_history_managers on public.settings_history for select to authenticated
using (app_private.current_user_role() in ('admin', 'office'));

create or replace function app_private.audit_settings_change()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  insert into public.settings_history (setting_type, version, actor, previous_snapshot, snapshot)
  values (case when tg_table_name = 'business_settings' then 'business' else 'dropdowns' end,
    new.version, auth.uid(), to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;
revoke all on function app_private.audit_settings_change() from public;
drop trigger if exists business_settings_audit on public.business_settings;
create trigger business_settings_audit after update on public.business_settings
for each row execute function app_private.audit_settings_change();
drop trigger if exists dropdown_settings_audit on public.dropdown_settings;
create trigger dropdown_settings_audit after update on public.dropdown_settings
for each row execute function app_private.audit_settings_change();

-- Only public contact/branding details are exposed to customer tracking pages.
create or replace function public.public_business_details()
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
  select jsonb_build_object(
    'company', coalesce(settings->'company', '{}'::jsonb),
    'stores', coalesce((select jsonb_object_agg(entry.key, (entry.value - 'defaults') || '{"defaults":null}'::jsonb)
      from jsonb_each(coalesce(settings->'stores', '{}'::jsonb)) entry), '{}'::jsonb)
  ) from public.business_settings where id = 1
$$;
revoke all on function public.public_business_details() from public;
grant execute on function public.public_business_details() to anon, authenticated;

-- Direct order writes and API status changes use the same mandatory-field rules.
create or replace function app_private.enforce_order_required_fields()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  rules jsonb;
  fields jsonb := '[]'::jsonb;
  field_name text;
  order_data jsonb;
begin
  select settings->'required' into rules from public.business_settings where id = 1;
  if tg_op = 'INSERT' then
    fields := coalesce(rules->'create', '[]'::jsonb);
  else
    if new.article_status is distinct from old.article_status then
      fields := fields || coalesce(rules->'transitions'->('article:' || new.article_status), '[]'::jsonb);
    end if;
    if new.print_status is distinct from old.print_status then
      fields := fields || coalesce(rules->'transitions'->('print:' || new.print_status), '[]'::jsonb);
    end if;
  end if;
  order_data := to_jsonb(new);
  for field_name in select jsonb_array_elements_text(fields) loop
    if field_name not in ('customer_email','accepted_by','supplier','print_supplier','logo_action','print_instructions','deadline','delivery_date','expected_article_delivery_date') then
      raise exception 'Onbekend verplicht orderveld: %', field_name;
    end if;
    if field_name in ('print_supplier','logo_action','print_instructions') and not coalesce(new.has_print,false) then continue; end if;
    if field_name = 'expected_article_delivery_date' and not coalesce(new.article_out_of_stock,false) then continue; end if;
    if nullif(btrim(order_data->>field_name), '') is null then
      raise exception 'Verplicht orderveld ontbreekt: %', field_name using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function app_private.enforce_order_required_fields() from public;
drop trigger if exists orders_configured_required_fields on public.orders;
create trigger orders_configured_required_fields before insert or update on public.orders
for each row execute function app_private.enforce_order_required_fields();
commit;
