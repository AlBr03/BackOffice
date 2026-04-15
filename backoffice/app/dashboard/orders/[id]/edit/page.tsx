import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrderEditForm } from '@/components/order-edit-form'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PageProps = {
  params: Promise<{ id: string }>
}

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

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id,
      club_name,
      accepted_by,
      wefact_reference,
      logo_action,
      supplier,
      product_description,
      print_instructions,
      quantity,
      has_print,
      deadline,
      delivery_date,
      notes,
      store_id
    `)
    .eq('id', id)
    .single()

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