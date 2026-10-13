begin;

alter table public.order_items add column if not exists supplier_available_date date;
comment on column public.order_items.supplier_available_date is 'Expected availability at the supplier, not arrival at the store.';

create or replace function public.replace_order_items(p_order_id uuid, p_items jsonb, p_changes jsonb default '{}'::jsonb)
returns void language plpgsql security invoker set search_path = pg_catalog, public as $$
declare item jsonb; changed public.orders; previous_items jsonb; incoming_items jsonb; matched_id uuid; used_ids uuid[] := '{}';
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
  if previous_items = incoming_items then
    -- Availability updates preserve item IDs and approved print details.
    for item in select jsonb_array_elements(p_items) loop
      select id into matched_id from public.order_items
      where order_id = p_order_id and not (id = any(used_ids))
        and product = item->>'product' and quantity = (item->>'quantity')::integer
        and product_code is not distinct from nullif(item->>'product_code', '')
        and size is not distinct from nullif(item->>'size', '')
        and personalisation is not distinct from nullif(item->'personalisation', 'null'::jsonb)
      order by (supplier_available_date is not distinct from nullif(item->>'supplier_available_date', '')::date) desc, id
      limit 1;
      if matched_id is null then raise exception 'Artikel kon niet worden gekoppeld.'; end if;
      used_ids := array_append(used_ids, matched_id);
      update public.order_items
      set supplier_available_date = nullif(item->>'supplier_available_date', '')::date
      where id = matched_id and supplier_available_date is distinct from nullif(item->>'supplier_available_date', '')::date;
    end loop;
    return;
  end if;
  delete from public.order_items where order_id = p_order_id;
  for item in select jsonb_array_elements(p_items) loop
    insert into public.order_items (order_id, product, quantity, product_code, size, personalisation, supplier_available_date)
    values (p_order_id, item->>'product', (item->>'quantity')::integer,
      nullif(item->>'product_code', ''), nullif(item->>'size', ''), nullif(item->'personalisation', 'null'::jsonb), nullif(item->>'supplier_available_date', '')::date);
  end loop;
end;
$$;
revoke all on function public.replace_order_items(uuid,jsonb,jsonb) from public, anon;
grant execute on function public.replace_order_items(uuid,jsonb,jsonb) to authenticated;

create or replace function app_private.invalidate_personalisation_approval()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare target_id uuid;
begin
  if tg_op = 'UPDATE' then
    if row(old.order_id, old.product, old.quantity, old.product_code, old.size, old.personalisation)
      is not distinct from row(new.order_id, new.product, new.quantity, new.product_code, new.size, new.personalisation) then
      return null;
    end if;
  end if;
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

commit;
