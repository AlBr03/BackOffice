import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrderEditForm } from '@/components/order-edit-form'
import { isOfficeLikeRole, isStoreLikeRole } from '@/lib/roles'

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
  article_order_responsibility,
  supplier,
  print_supplier,
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
    product_code,
    size
  )
`

const ORDER_EDIT_SELECT_LEGACY = `
  id,
  club_name,
  accepted_by,
  wefact_reference,
  logo_action,
  article_order_responsibility,
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
    product_code,
    size
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

  if (error && /wefact_(quote|invoice)_|print_supplier/i.test(error.message)) {
    const fallbackResult = await supabase
      .from('orders')
      .select(ORDER_EDIT_SELECT_LEGACY)
      .eq('id', id)
      .single()

    error = fallbackResult.error

    if (fallbackResult.data) {
      order = {
        ...fallbackResult.data,
        wefact_quote_reference: fallbackResult.data.wefact_reference ?? null,
        wefact_quote_url: null,
        wefact_invoice_reference: null,
        wefact_invoice_url: null,
        print_supplier: null,
      }
    } else {
      order = null
    }
  }

  if (error || !order) {
    notFound()
  }

  const isOfficeLike = isOfficeLikeRole(profile?.role)
  const canEditOrder =
    isOfficeLike ||
    (isStoreLikeRole(profile?.role) && profile?.store_id === order.store_id)

  if (!canEditOrder) {
    notFound()
  }

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
