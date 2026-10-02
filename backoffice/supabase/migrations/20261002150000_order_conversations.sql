begin;
alter table public.order_activity_log drop constraint if exists order_activity_log_action_type_check;
alter table public.order_activity_log add constraint order_activity_log_action_type_check check (
  action_type in ('created','order_updated','status_changed','reminder_sent','customer_logo_uploaded',
    'print_proof_ready','print_proof_approved','print_proof_rejected','conversation_message')
) not valid;
create table if not exists public.order_conversations (
  order_id uuid primary key references public.orders(id) on delete cascade,
  status text not null default 'open' check (status in ('open','answered','closed')),
  team text not null default 'store' check (team in ('store','office','print')),
  assigned_user uuid references public.profiles(id) on delete set null,
  revision integer not null default 0,
  last_message_id bigint not null default 0,
  last_staff_message_id bigint not null default 0,
  customer_read_id bigint not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.order_messages (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.order_conversations(order_id) on delete cascade,
  sender_kind text not null check (sender_kind in ('customer','staff')),
  sender_id uuid references auth.users(id) on delete set null,
  body text not null check (length(btrim(body)) between 1 and 4000),
  client_nonce uuid not null,
  created_at timestamptz not null default now(),
  unique(order_id, client_nonce)
);
create index if not exists order_messages_order_cursor_idx on public.order_messages(order_id,id desc);
create index if not exists order_messages_customer_rate_idx on public.order_messages(order_id,created_at desc) where sender_kind = 'customer';
create table if not exists public.order_conversation_reads (
  order_id uuid not null references public.order_conversations(order_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_seen_id bigint not null default 0,
  primary key(order_id,user_id)
);
alter table public.order_conversations enable row level security;
alter table public.order_messages enable row level security;
alter table public.order_conversation_reads enable row level security;
-- Only the server API can read/write conversations. Every API request validates
-- the employee session or the tracking token; no anonymous table access.
revoke all on public.order_conversations, public.order_messages, public.order_conversation_reads from public, anon, authenticated;
grant all on public.order_conversations, public.order_messages, public.order_conversation_reads to service_role;
grant usage, select on sequence public.order_messages_id_seq to service_role;

create or replace function app_private.conversation_actor_allowed(p_order uuid, p_actor uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select exists(select 1 from public.orders o join public.profiles p on p.id = p_actor
    where o.id = p_order and (p.role in ('admin','office','order_manager')
      or (p.role = 'print' and o.has_print)
      or (p.role in ('store','store_manager') and p.store_id = o.store_id)))
$$;
revoke all on function app_private.conversation_actor_allowed(uuid,uuid) from public, anon, authenticated;

create or replace function public.conversation_action(p_order uuid, p_token text, p_actor uuid, p_action text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  thread public.order_conversations;
  existing public.order_messages;
  next_id bigint;
  seen_id bigint;
  nonce uuid;
  message_body text;
  target uuid;
  next_team text;
  next_status text;
begin
  -- Lock the parent to serialize first messages, retries, read markers and assignment.
  perform 1 from public.orders where id = p_order for update;
  if not found then raise exception 'Order niet gevonden.' using errcode = '42501'; end if;
  if p_actor is null then
    if p_token is null or not exists(select 1 from public.orders where id = p_order and tracking_token = p_token) then
      raise exception 'Geen toegang.' using errcode = '42501';
    end if;
  elsif not app_private.conversation_actor_allowed(p_order,p_actor) then
    raise exception 'Geen toegang.' using errcode = '42501';
  end if;
  if p_action not in ('send','read','manage') or p_action is null then
    raise exception 'Ongeldige actie.' using errcode = '23514';
  end if;
  if p_action = 'manage' and p_actor is null then raise exception 'Geen toegang.' using errcode = '42501'; end if;
  insert into public.order_conversations(order_id) values(p_order) on conflict do nothing;
  select * into thread from public.order_conversations where order_id = p_order for update;
  if p_action = 'send' then
    message_body := btrim(p_payload->>'body');
    if message_body is null or length(message_body) not between 1 and 4000 then
      raise exception 'Vul een bericht in van maximaal 4000 tekens.' using errcode = '23514';
    end if;
    nonce := (p_payload->>'nonce')::uuid;
    if nonce is null then raise exception 'Ongeldig berichtnummer.' using errcode = '23514'; end if;
    select * into existing from public.order_messages where order_id = p_order and client_nonce = nonce;
    if found then
      if existing.sender_id is distinct from p_actor or existing.body <> message_body then
        raise exception 'Ongeldig herhaald bericht.' using errcode = '23514';
      end if;
      return jsonb_build_object('id',existing.id,'duplicate',true);
    end if;
    if p_actor is null and (
      exists(select 1 from public.order_messages where order_id = p_order and sender_kind = 'customer' and created_at > now() - interval '15 seconds')
      or (select count(*) from public.order_messages where order_id = p_order and sender_kind = 'customer' and created_at > now() - interval '1 hour') >= 20
    ) then raise exception 'Wacht even voordat u nog een bericht verstuurt (maximaal 20 per uur).' using errcode = 'P0001'; end if;
    insert into public.order_messages(order_id,sender_kind,sender_id,body,client_nonce)
      values(p_order,case when p_actor is null then 'customer' else 'staff' end,p_actor,message_body,nonce)
      returning id into next_id;
    update public.order_conversations set last_message_id = next_id,
      last_staff_message_id = case when p_actor is null then last_staff_message_id else next_id end,
      status = case when p_actor is null then 'open' else 'answered' end,
      revision = revision + 1, updated_at = now() where order_id = p_order;
    if p_actor is not null then
      insert into public.order_conversation_reads(order_id,user_id,last_seen_id) values(p_order,p_actor,next_id)
        on conflict(order_id,user_id) do update set last_seen_id = greatest(order_conversation_reads.last_seen_id,excluded.last_seen_id);
    end if;
    insert into public.order_activity_log(order_id,action_type,description,performed_by)
      values(p_order,'conversation_message',case when p_actor is null then 'Nieuw klantbericht' else 'Antwoord aan klant verstuurd' end,p_actor);
    return jsonb_build_object('id',next_id,'duplicate',false);
  elsif p_action = 'read' then
    seen_id := (p_payload->>'through')::bigint;
    if seen_id is null or seen_id < 0 or (seen_id <> 0 and not exists(select 1 from public.order_messages where order_id = p_order and id = seen_id)) then
      raise exception 'Ongeldig gelezen bericht.' using errcode = '23514';
    end if;
    if p_actor is null then
      update public.order_conversations set customer_read_id = greatest(customer_read_id,seen_id) where order_id = p_order;
    else
      insert into public.order_conversation_reads(order_id,user_id,last_seen_id) values(p_order,p_actor,seen_id)
        on conflict(order_id,user_id) do update set last_seen_id = greatest(order_conversation_reads.last_seen_id,excluded.last_seen_id);
    end if;
    return '{}'::jsonb;
  else
    if (p_payload->>'revision')::integer is distinct from thread.revision then
      raise exception 'Het gesprek is gewijzigd. Vernieuw het gesprek en probeer opnieuw.' using errcode = '40001';
    end if;
    next_team := p_payload->>'team'; next_status := p_payload->>'status';
    target := nullif(p_payload->>'assigned_user','')::uuid;
    if next_team is null or next_team not in ('store','office','print') or next_status is null or next_status not in ('open','answered','closed') then
      raise exception 'Ongeldige toewijzing of status.' using errcode = '23514';
    end if;
    if next_team = 'print' and not exists(select 1 from public.orders where id = p_order and has_print) then
      raise exception 'Deze order heeft geen printwerk.' using errcode = '23514';
    end if;
    if target is not null and not app_private.conversation_actor_allowed(p_order,target) then
      raise exception 'Deze medewerker heeft geen toegang tot de order.' using errcode = '23514';
    end if;
    update public.order_conversations set team = next_team, status = next_status, assigned_user = target,
      revision = revision + 1, updated_at = now() where order_id = p_order;
    insert into public.order_activity_log(order_id,action_type,description,performed_by)
      values(p_order,'conversation_message','Klantgesprek toegewezen of status aangepast',p_actor);
    return jsonb_build_object('notify', next_status <> 'closed' and thread.last_message_id > thread.last_staff_message_id
      and (target is distinct from thread.assigned_user or next_team is distinct from thread.team));
  end if;
end;
$$;
revoke all on function public.conversation_action(uuid,text,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.conversation_action(uuid,text,uuid,text,jsonb) to service_role;
commit;
