import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrderForm } from '@/components/order-form'

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

  const { data: stores } = await supabase
    .from('stores')
    .select('id, name')
    .order('name')

  return (
    <OrderForm
      role={profile?.role ?? null}
      storeId={profile?.store_id ?? null}
      stores={stores ?? []}
    />
  )
}