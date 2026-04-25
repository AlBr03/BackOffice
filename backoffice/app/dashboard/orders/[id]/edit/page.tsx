import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrderEditForm } from '@/components/order-edit-form'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PageProps = {
  params: Promise<{ id: string }>
}

const ORDER_EDIT_SELECT = `
  id,
  club_name,
  accepted_by,
  wefact_reference,
  wefact_quote_reference,
  wefact_quote_url,
  wefact_invoice_reference,
  wefact_invoice_url,
  logo_action,
  supplier,
  customer_email,
  article_status,
  print_status,
  product_description,
  print_instructions,
  quantity,
  has_print,
  deadline,
  delivery_date,
  notes,
  store_id,
  order_items (
    product,
    quantity,
    product_code
  )
`

const ORDER_EDIT_SELECT_LEGACY = `
  id,
  club_name,
  accepted_by,
  wefact_reference,
  logo_action,
  supplier,
  customer_email,
  article_status,
  print_status,
  product_description,
  print_instructions,
  quantity,
  has_print,
  deadline,
  delivery_date,
  notes,
  store_id,
  order_items (
    product,
    quantity,
    product_code
  )
`

export default async function EditOrderPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, store_id')
    .eq('id', user.id)
    .single()

  let { data: order, error } = await supabase
    .from('orders')
    .select(ORDER_EDIT_SELECT)
    .eq('id', id)
    .single()

  if (error && /wefact_(quote|invoice)_/i.test(error.message)) {
    const fallbackResult = await supabase
      .from('orders')
      .select(ORDER_EDIT_SELECT_LEGACY)
      .eq('id', id)
      .single()

    error = fallbackResult.error
    order = fallbackResult.data

    if (order) {
      order = {
        ...order,
        wefact_quote_reference: order.wefact_reference ?? null,
        wefact_quote_url: null,
        wefact_invoice_reference: null,
        wefact_invoice_url: null,
      }
    }
  }

  if (error || !order) {
    notFound()
  }

  const isOfficeLike = profile?.role === 'office' || profile?.role === 'admin'

  const { data: stores } = isOfficeLike
    ? await supabase.from('stores').select('id, name').order('name')
    : {
        data: profile?.store_id
          ? [{ id: profile.store_id, name: 'Eigen winkel' }]
          : [],
      }

  return (
    <OrderEditForm
      role={profile?.role ?? null}
      stores={stores ?? []}
      order={order}
    />
  )
}
