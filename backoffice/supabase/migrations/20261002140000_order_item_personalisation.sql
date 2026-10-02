begin;
alter table public.order_items add column if not exists personalisation jsonb;
alter table public.orders add column if not exists personalisation_version integer not null default 0;

create or replace function app_private.validate_item_personalisation()
returns trigger language plpgsql set search_path = pg_catalog as $$
declare
  p jsonb := new.personalisation;
  r jsonb;
  c jsonb;
  v jsonb;
  ids text[] := '{}';
  total bigint := 0;
  key_name text;
begin
  if p is null then return new; end if;
  if jsonb_typeof(p) <> 'object'
    or jsonb_typeof(p->'instructions') is distinct from 'string'
    or length(p->>'instructions') > 4000
    or jsonb_typeof(p->'columns') is distinct from 'array'
    or jsonb_typeof(p->'rows') is distinct from 'array' then
    raise exception 'Ongeldige personalisatietabel.' using errcode = '23514';
  end if;
  if jsonb_array_length(p->'columns') > 12 or jsonb_array_length(p->'rows') > 1000 then
    raise exception 'Maximaal 12 extra kolommen en 1000 personalisatieregels.' using errcode = '23514';
  end if;
  for c in select jsonb_array_elements(p->'columns') loop
    if jsonb_typeof(c->'id') is distinct from 'string'
      or (c->>'id') !~ '^field_[a-zA-Z0-9_-]+$' or (c->>'id') = any(ids)
      or jsonb_typeof(c->'label') is distinct from 'string'
      or length(btrim(c->>'label')) = 0 or length(c->>'label') > 80 then
      raise exception 'Ongeldige extra kolom.' using errcode = '23514';
    end if;
    ids := array_append(ids, c->>'id');
  end loop;
  for r in select jsonb_array_elements(p->'rows') loop
    if jsonb_typeof(r->'quantity') is distinct from 'number'
      or (r->>'quantity') !~ '^[0-9]{1,6}$'
      or jsonb_typeof(r->'extra') is distinct from 'object' then
      raise exception 'Ongeldig aantal of extra velden.' using errcode = '23514';
    end if;
    if (r->>'quantity')::integer < 1 or (r->>'quantity')::integer > 100000 then
      raise exception 'Elk aantal moet tussen 1 en 100000 liggen.' using errcode = '23514';
    end if;
    total := total + (r->>'quantity')::integer;
    foreach key_name in array array['initials','number','name','notes'] loop
      if jsonb_typeof(r->key_name) is distinct from 'string' or length(r->>key_name) > 1000 then
        raise exception 'Ongeldige celwaarde (maximaal 1000 tekens).' using errcode = '23514';
      end if;
    end loop;
    for key_name, v in select * from jsonb_each(r->'extra') loop
      if not (key_name = any(ids)) or jsonb_typeof(v) <> 'string' or length(v #>> '{}') > 1000 then
        raise exception 'Ongeldige extra celwaarde.' using errcode = '23514';
      end if;
    end loop;
  end loop;
  if jsonb_array_length(p->'rows') > 0 and total <> new.quantity then
    raise exception 'Personalisatieaantallen moeten overeenkomen met het artikelaantal (%).', new.quantity using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function app_private.validate_item_personalisation() from public;
drop trigger if exists order_items_validate_personalisation on public.order_items;
create trigger order_items_validate_personalisation before insert or update on public.order_items
for each row execute function app_private.validate_item_personalisation();

-- Invoker rights retain all existing order/item RLS restrictions. Replacement
-- rolls back completely if any insert fails, preserving the previous articles.
create or replace function public.replace_order_items(p_order_id uuid, p_items jsonb, p_changes jsonb default '{}'::jsonb)
returns void language plpgsql security invoker set search_path = pg_catalog, public as $$
declare item jsonb; changed public.orders; previous_items jsonb; incoming_items jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.orders o where o.id = p_order_id
      and app_private.can_manage_order(o.store_id)
  ) then raise exception 'Geen toegang tot deze order.' using errcode = '42501'; end if;
  select * into changed from public.orders where id = p_order_id for update;
  changed := jsonb_populate_record(changed, p_changes);
  if not app_private.can_manage_order(changed.store_id) then
    raise exception 'Geen toegang tot de gekozen winkel.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Vul minimaal een productregel in.' using errcode = '23514';
  end if;
  select jsonb_agg(value order by value::text) into previous_items from (
    select jsonb_build_object('product', product, 'quantity', quantity,
      'product_code', product_code, 'size', size, 'personalisation', personalisation) as value
    from public.order_items where order_id = p_order_id
  ) existing;
  select jsonb_agg(value order by value::text) into incoming_items from (
    select jsonb_build_object('product', entry->>'product', 'quantity', (entry->>'quantity')::integer,
      'product_code', nullif(entry->>'product_code', ''), 'size', nullif(entry->>'size', ''),
      'personalisation', nullif(entry->'personalisation', 'null'::jsonb)) as value
    from jsonb_array_elements(p_items) entry
  ) incoming;
  -- Whitelist editable metadata; client input cannot alter IDs or order numbers.
  update public.orders set store_id = changed.store_id, club_name = changed.club_name,
    accepted_by = changed.accepted_by, wefact_reference = changed.wefact_reference,
    wefact_quote_reference = changed.wefact_quote_reference, wefact_quote_url = changed.wefact_quote_url,
    wefact_invoice_reference = changed.wefact_invoice_reference, wefact_invoice_url = changed.wefact_invoice_url,
    logo_action = changed.logo_action, article_order_responsibility = changed.article_order_responsibility,
    supplier = changed.supplier, article_out_of_stock = changed.article_out_of_stock,
    expected_article_delivery_date = changed.expected_article_delivery_date,
    article_delivery_reminder_days_before = changed.article_delivery_reminder_days_before,
    article_delivery_reminder_sent_at = changed.article_delivery_reminder_sent_at,
    print_supplier = changed.print_supplier, customer_email = changed.customer_email,
    product_description = changed.product_description, print_instructions = changed.print_instructions,
    quantity = changed.quantity, has_print = changed.has_print, print_status = changed.print_status,
    status = changed.status, deadline = changed.deadline, delivery_date = changed.delivery_date,
    notes = changed.notes where id = p_order_id;
  -- Saving unrelated customer details must not invalidate an unchanged proof.
  if previous_items = incoming_items then return; end if;
  delete from public.order_items where order_id = p_order_id;
  for item in select jsonb_array_elements(p_items) loop
    insert into public.order_items (order_id, product, quantity, product_code, size, personalisation)
    values (p_order_id, item->>'product', (item->>'quantity')::integer,
      nullif(item->>'product_code', ''), nullif(item->>'size', ''), nullif(item->'personalisation', 'null'::jsonb));
  end loop;
end;
$$;
revoke all on function public.replace_order_items(uuid,jsonb,jsonb) from public, anon;
grant execute on function public.replace_order_items(uuid,jsonb,jsonb) to authenticated;

-- An approval no longer represents the current print details after an edit.
create or replace function app_private.invalidate_personalisation_approval()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare target_id uuid;
begin
  if tg_op = 'DELETE' then target_id := old.order_id; else target_id := new.order_id; end if;
  update public.orders set personalisation_version = personalisation_version + 1,
    print_proof_status = case when has_print and print_proof_status in ('approved','rejected') then 'pending' else print_proof_status end,
    print_proof_feedback = case when has_print then null else print_proof_feedback end,
    print_proof_responded_at = case when has_print then null else print_proof_responded_at end
    where id = target_id;
  return null;
end;
$$;
revoke all on function app_private.invalidate_personalisation_approval() from public;
drop trigger if exists order_items_invalidate_approval on public.order_items;
create trigger order_items_invalidate_approval after insert or update or delete on public.order_items
for each row execute function app_private.invalidate_personalisation_approval();

create or replace function app_private.invalidate_print_instructions_approval()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  if new.print_instructions is distinct from old.print_instructions then
    new.personalisation_version := old.personalisation_version + 1;
    if new.has_print and new.print_proof_status in ('approved','rejected') then
      new.print_proof_status := 'pending';
      new.print_proof_feedback := null;
      new.print_proof_responded_at := null;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function app_private.invalidate_print_instructions_approval() from public;
drop trigger if exists orders_print_instructions_approval on public.orders;
create trigger orders_print_instructions_approval before update on public.orders
for each row execute function app_private.invalidate_print_instructions_approval();
commit;
