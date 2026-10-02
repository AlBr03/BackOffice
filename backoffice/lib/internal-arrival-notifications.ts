import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendInternalArrivalEmail, sendOrderCreatedEmail } from '@/lib/order-notifications'
import { getPublicAppUrl } from '@/lib/public-url'

type ArrivalOrder = Parameters<typeof sendOrderCreatedEmail>[0] & { id: string; store_id: string | null }
export async function notifyInternalArrival(order: ArrivalOrder, summary: string) {
  const admin = createAdminClient()
  const roles = ['store', 'store_manager', 'office', 'order_manager', 'admin', ...(order.has_print ? ['print'] : [])]
  const { data: profiles, error } = await admin.from('profiles').select('id, role, store_id').in('role', roles)
  if (error) throw new Error('Interne ontvangers konden niet worden opgehaald.')
  const relevant = (profiles ?? []).filter(p => !['store', 'store_manager'].includes(p.role) || (!!order.store_id && p.store_id === order.store_id))
  const addresses = await Promise.all(relevant.map(async p => {
    const { data, error } = await admin.auth.admin.getUserById(p.id)
    if (error) throw new Error('Interne ontvanger kon niet worden opgehaald.')
    return data.user?.email?.trim().toLowerCase() ?? null
  }))
  const emails = [...new Set(addresses.filter((email): email is string => !!email))]
  const appUrl = getPublicAppUrl()
  const results = await Promise.allSettled(emails.map(email => sendInternalArrivalEmail(email, { ...order, order_detail_url: appUrl ? `${appUrl}/dashboard/orders/${order.id}` : null }, summary)))
  return { total: emails.length, sent: results.filter(r => r.status === 'fulfilled' && !r.value.skipped).length, failed: results.filter(r => r.status === 'rejected').length, skipped: results.filter(r => r.status === 'fulfilled' && r.value.skipped).length }
}
