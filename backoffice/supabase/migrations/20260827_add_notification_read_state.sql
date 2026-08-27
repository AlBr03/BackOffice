create table if not exists public.notification_read_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.notification_read_state enable row level security;

drop policy if exists "notification_read_state_select_own" on public.notification_read_state;
create policy "notification_read_state_select_own" on public.notification_read_state
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "notification_read_state_insert_own" on public.notification_read_state;
create policy "notification_read_state_insert_own" on public.notification_read_state
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "notification_read_state_update_own" on public.notification_read_state;
create policy "notification_read_state_update_own" on public.notification_read_state
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
