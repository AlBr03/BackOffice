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

  return <OrderForm storeId={profile?.store_id ?? null} />
}