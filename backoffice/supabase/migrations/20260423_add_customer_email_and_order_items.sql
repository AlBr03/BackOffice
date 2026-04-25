alter table public.orders
add column if not exists customer_email text;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product text not null,
  quantity integer not null check (quantity > 0),
  product_code text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_product_idx on public.order_items(product);

insert into public.order_items (order_id, product, quantity, product_code)
select
  o.id,
  case
    when position(' || ' in line.item_line) > 0 then split_part(line.item_line, ' || ', 1)
    else line.item_line
  end as product,
  case
    when position(' || ' in line.item_line) > 0
      and nullif(split_part(line.item_line, ' || ', 2), '') ~ '^[0-9]+$'
      then split_part(line.item_line, ' || ', 2)::integer
    else greatest(coalesce(o.quantity, 1), 1)
  end as quantity,
  nullif(
    case
      when position(' || ' in line.item_line) > 0 then split_part(line.item_line, ' || ', 3)
      else ''
    end,
    ''
  ) as product_code
from public.orders o
cross join lateral unnest(string_to_array(coalesce(o.product_description, ''), E'\n')) as line(item_line)
where trim(line.item_line) <> ''
and not exists (
  select 1
  from public.order_items existing
  where existing.order_id = o.id
);

update public.orders
set customer_email = nullif(
  regexp_replace(notes, '.*Klant e-mail:\s*([^\n\r]+).*', '\1', 'n'),
  notes
)
where customer_email is null
and notes ilike '%Klant e-mail:%';
