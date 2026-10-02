import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { canAccessConversation } from '@/lib/order-conversation'
import { sendConversationEmail } from '@/lib/order-notifications'
import { getPublicAppUrl } from '@/lib/public-url'

type MailOrder = Parameters<typeof sendConversationEmail>[1] & { id: string; store_id: string | null }
export async function notifyConversationMessage(order: MailOrder, fromCustomer: boolean) {
  if (!fromCustomer) {
    if (!order.customer_email) return { skipped: true }
    return sendConversationEmail(order.customer_email,order,true)
  }
  const admin = createAdminClient()
  const { data: thread, error } = await admin.from('order_conversations').select('assigned_user,team').eq('order_id',order.id).single()
  if (error) throw new Error('Gesprek kon niet worden geladen.')
  const candidates = async (roles: string[], assigned?: string) => {
    let query = admin.from('profiles').select('id,role,store_id')
    if (assigned) query = query.eq('id',assigned)
    else {
      query = query.in('role',roles)
      if (roles.includes('store')) {
        if (!order.store_id) return []
        query = query.eq('store_id',order.store_id)
      }
    }
    const result = await query
    if (result.error) throw new Error('Ontvangers konden niet worden geladen.')
    return (result.data ?? []).filter(p => canAccessConversation(p,order))
  }
  let recipients = thread.assigned_user ? await candidates([],thread.assigned_user) : []
  if (!recipients.length) recipients = await candidates(thread.team === 'print' ? ['print'] : thread.team === 'office' ? ['office','order_manager','admin'] : ['store','store_manager'])
  if (!recipients.length) recipients = await candidates(['office','admin'])
  const addresses = await Promise.all(recipients.map(async p => {
    const result = await admin.auth.admin.getUserById(p.id)
    if (result.error) throw new Error('Ontvanger kon niet worden geladen.')
    return result.data.user?.email?.trim().toLowerCase()
  }))
  const emails = [...new Set(addresses.filter((v): v is string => !!v))]
  const root = getPublicAppUrl()
  const results = await Promise.allSettled(emails.map(to => sendConversationEmail(to,{ ...order, order_detail_url: root ? `${root}/dashboard/orders/${order.id}` : null },false)))
  return { total: emails.length, failed: results.filter(r => r.status === 'rejected').length }
}
