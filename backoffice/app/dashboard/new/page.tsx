import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrderForm } from '@/components/order-form'
import { isOfficeLikeRole, isStoreLikeRole } from '@/lib/roles'

export default async function NewOrderPage() {
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

  const canCreateOrder =
    isOfficeLikeRole(profile?.role) ||
    (isStoreLikeRole(profile?.role) && Boolean(profile?.store_id))

  if (!canCreateOrder) {
    redirect('/dashboard')
  }

  const { data: stores } = isOfficeLikeRole(profile?.role)
    ? await supabase.from('stores').select('id, name').order('name')
    : {
        data: profile?.store_id
          ? [{ id: profile.store_id, name: 'Eigen winkel' }]
          : [],
      }

  return (
    <OrderForm
      role={profile?.role ?? null}
      storeId={profile?.store_id ?? null}
      stores={stores ?? []}
    />
  )
}
