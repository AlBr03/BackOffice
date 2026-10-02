import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { canAccessConversation, conversationCursor, conversationText } from '@/lib/order-conversation'
import { notifyConversationMessage } from '@/lib/order-conversation-mail'

class ConversationError extends Error { constructor(message: string, public status = 400) { super(message) } }
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
async function context(identifier: string, customer: boolean) {
  const admin = createAdminClient()
  let actor: string | null = null
  let profile: { role: string | null; store_id: string | null } | null = null
  if (!customer) {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) throw new ConversationError('Niet ingelogd.',401)
    actor = user.id
    const result = await client.from('profiles').select('role,store_id').eq('id',actor).single()
    profile = result.data
  }
  const { data: order, error } = await admin.from('orders').select('id,order_number,tracking_token,customer_email,club_name,store_id,has_print,article_status,print_status,notes,deadline,delivery_date,stores(name)').eq(customer ? 'tracking_token' : 'id',identifier).single()
  if (error || !order || (!customer && !canAccessConversation(profile,order))) throw new ConversationError('Order niet gevonden of geen toegang.',404)
  return { admin, order, actor, token: customer ? identifier : null }
}
function failure(error: unknown) {
  return error instanceof ConversationError ? json({ error: error.message },error.status) : json({ error: 'Het gesprek kon niet worden geladen. Probeer het opnieuw.' },500)
}
export async function getConversation(request: NextRequest, identifier: string, customer: boolean) {
  try {
    const after = conversationCursor(request.nextUrl.searchParams.get('after'))
    const before = conversationCursor(request.nextUrl.searchParams.get('before'))
    if (after !== null && before !== null) throw new ConversationError('Gebruik één berichtcursor.')
    const { admin, order, actor } = await context(identifier,customer)
    const result = await admin.from('order_conversations').select('status,team,assigned_user,revision,last_message_id,last_staff_message_id,customer_read_id').eq('order_id',order.id).maybeSingle()
    if (result.error) throw new ConversationError('Gesprekken zijn nog niet beschikbaar. Neem contact op met hoofdkantoor.',503)
    const thread = result.data ?? { status: 'open', team: 'store', assigned_user: null, revision: 0, last_message_id: 0, last_staff_message_id: 0, customer_read_id: 0 }
    let seen = thread.customer_read_id
    if (actor) {
      const read = await admin.from('order_conversation_reads').select('last_seen_id').eq('order_id',order.id).eq('user_id',actor).maybeSingle()
      if (read.error) throw new ConversationError('Leesstatus kon niet worden geladen.',503)
      seen = read.data?.last_seen_id ?? 0
    }
    const unread = (customer ? thread.last_staff_message_id : thread.last_message_id) > seen
    // Customer payloads omit employee assignment IDs and internal read state.
    const visibleThread = customer ? { status: thread.status, revision: thread.revision, last_message_id: thread.last_message_id } : thread
    if (request.nextUrl.searchParams.get('summary') === '1') return json({ thread: visibleThread, unread })
    let query = admin.from('order_messages').select('id,body,sender_kind,created_at').eq('order_id',order.id)
    if (after !== null) query = query.gt('id',after)
    if (before !== null) query = query.lt('id',before)
    const messages = await query.order('id',{ ascending: after !== null }).limit(51)
    if (messages.error) throw new ConversationError('Berichten konden niet worden geladen.',503)
    const page = (messages.data ?? []).slice(0,50)
    if (after === null) page.reverse()
    let assignees: { id: string; full_name: string; role: string }[] | undefined
    if (!customer && after === null && before === null) {
      const globalRoles = ['office','order_manager','admin',...(order.has_print ? ['print'] : [])]
      let candidates = admin.from('profiles').select('id,full_name,role,store_id').in('role',[...globalRoles,'store','store_manager'])
      candidates = order.store_id ? candidates.or(`role.in.(${globalRoles.join(',')}),store_id.eq.${order.store_id}`) : candidates.in('role',globalRoles)
      const staff = await candidates
      if (staff.error) throw new ConversationError('Medewerkers konden niet worden geladen.',503)
      assignees = (staff.data ?? []).filter(p => canAccessConversation(p,order)).map(p => ({ id: p.id, full_name: p.full_name || 'Medewerker', role: p.role }))
    }
    return json({ thread: visibleThread, unread, messages: page, moreBefore: after === null && (messages.data?.length ?? 0) > 50, moreAfter: after !== null && (messages.data?.length ?? 0) > 50, assignees, hasPrint: !customer ? !!order.has_print : undefined })
  } catch (error) { return failure(error instanceof Error && !(error instanceof ConversationError) && /cursor/.test(error.message) ? new ConversationError(error.message) : error) }
}

async function boundedBody(request: NextRequest) {
  const reader = request.body?.getReader()
  if (!reader) throw new ConversationError('Ongeldig verzoek.')
  const parts: Uint8Array[] = []; let length = 0
  while (true) {
    const part = await reader.read()
    if (part.done) break
    length += part.value.byteLength
    if (length > 24000) { await reader.cancel(); throw new ConversationError('Het bericht is te groot.',413) }
    parts.push(part.value)
  }
  try { return JSON.parse(Buffer.concat(parts).toString('utf8')) as Record<string,unknown> }
  catch { throw new ConversationError('Ongeldig verzoek.') }
}
export async function postConversation(request: NextRequest, identifier: string, customer: boolean) {
  try {
    const origin = request.headers.get('origin')
    if (origin && origin !== request.nextUrl.origin) throw new ConversationError('Ongeldige oorsprong.',403)
    const body = await boundedBody(request)
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ConversationError('Ongeldig verzoek.')
    const action = body.action
    if (!['send','read','manage'].includes(String(action)) || (customer && action === 'manage')) throw new ConversationError('Ongeldige actie.')
    let payload: Record<string,unknown>
    if (action === 'send') {
      let text: string
      try { text = conversationText(body.body) } catch (e) { throw new ConversationError((e as Error).message) }
      if (typeof body.nonce !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.nonce)) throw new ConversationError('Ongeldig berichtnummer.')
      payload = { body: text, nonce: body.nonce }
    } else if (action === 'read') {
      if (!Number.isSafeInteger(body.through) || Number(body.through) < 0) throw new ConversationError('Ongeldige leesstatus.')
      payload = { through: body.through }
    } else {
      if (!['open','answered','closed'].includes(String(body.status)) || !['store','office','print'].includes(String(body.team)) || !Number.isInteger(body.revision)) throw new ConversationError('Ongeldige gesprekstatus of toewijzing.')
      if (body.assigned_user !== null && (typeof body.assigned_user !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.assigned_user))) throw new ConversationError('Ongeldige medewerker.')
      payload = { status: body.status, team: body.team, assigned_user: body.assigned_user, revision: body.revision }
    }
    const { admin, order, actor, token } = await context(identifier,customer)
    const { data, error } = await admin.rpc('conversation_action',{ p_order: order.id, p_token: token, p_actor: actor, p_action: action, p_payload: payload })
    if (error) {
      const status = error.code === 'P0001' ? 429 : error.code === '40001' ? 409 : error.code === '42501' ? 403 : error.code === 'PGRST202' || error.code === '42P01' ? 503 : 400
      throw new ConversationError(status === 503 ? 'Gesprekken zijn nog niet beschikbaar. Neem contact op met hoofdkantoor.' : status === 400 && !['23514','22P02'].includes(error.code) ? 'Het bericht kon niet worden opgeslagen.' : error.message,status)
    }
    let email: unknown = null
    if ((action === 'send' && !data?.duplicate) || (action === 'manage' && data?.notify)) {
      try { email = await notifyConversationMessage(order,action === 'manage' || customer) }
      catch { email = { failed: true } }
    }
    // A failed mail never turns a saved message into a failed submission.
    return json({ ok: true, id: data?.id, duplicate: data?.duplicate ?? false, emailFailed: !!(email as { failed?: unknown } | null)?.failed })
  } catch (error) { return failure(error) }
}
