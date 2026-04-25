alter table public.orders
add column if not exists wefact_quote_reference text,
add column if not exists wefact_quote_url text,
add column if not exists wefact_invoice_reference text,
add column if not exists wefact_invoice_url text;

update public.orders
set wefact_quote_reference = coalesce(wefact_quote_reference, wefact_reference)
where wefact_reference is not null
  and wefact_quote_reference is null;
