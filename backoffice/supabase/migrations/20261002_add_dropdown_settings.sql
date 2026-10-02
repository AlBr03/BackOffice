-- Labels and presentation are configurable; internal workflow/permission values remain stable.
create table if not exists public.dropdown_settings (
  id integer primary key check (id = 1),
  options jsonb not null default '{}'::jsonb check (jsonb_typeof(options) = 'object'),
  version integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.dropdown_settings (id) values (1) on conflict (id) do nothing;
alter table public.dropdown_settings enable row level security;
grant select (id, options, version) on public.dropdown_settings to anon, authenticated;
grant update on public.dropdown_settings to authenticated;
revoke insert, delete on public.dropdown_settings from anon, authenticated;

drop policy if exists "dropdown_settings_read" on public.dropdown_settings;
create policy "dropdown_settings_read" on public.dropdown_settings
for select to anon, authenticated using (true);

drop policy if exists "dropdown_settings_manage" on public.dropdown_settings;
create policy "dropdown_settings_manage" on public.dropdown_settings
for update to authenticated
using (app_private.current_user_role() in ('admin', 'office'))
with check (app_private.current_user_role() in ('admin', 'office'));
