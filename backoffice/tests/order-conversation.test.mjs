import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server.js'
import { load } from './load-ts.mjs'
const { canAccessConversation, conversationText, conversationCursor, watchConversation } = load('lib/order-conversation.ts')
const order = { id: 'order-a', tracking_token: 'secret-a', order_number: '100001', store_id: 'store-a', has_print: true, customer_email: 'customer@example.invalid', club_name: 'Club', article_status: 'new', print_status: 'new', notes: null, deadline: null, delivery_date: null }
test('conversation permissions exclude other stores, pending users and non-print orders for print staff', () => {
  assert.equal(canAccessConversation({ role: 'store', store_id: 'store-a' },order),true)
  assert.equal(canAccessConversation({ role: 'store_manager', store_id: 'store-b' },order),false)
  assert.equal(canAccessConversation({ role: 'store', store_id: null },{ ...order, store_id: null }),false)
  assert.equal(canAccessConversation({ role: 'print', store_id: null },{ ...order, has_print: false }),false)
  assert.equal(canAccessConversation({ role: 'print', store_id: null },order),true)
  assert.equal(canAccessConversation({ role: 'office', store_id: null },order),true)
  assert.equal(canAccessConversation({ role: 'pending', store_id: 'store-a' },order),false)
})
test('message validation trims text and rejects blanks, oversized content and unsafe cursors', () => {
  assert.equal(conversationText('  Vraag\n '),'Vraag')
  for (const value of ['', ' \n ',null,'x'.repeat(4001)]) assert.throws(() => conversationText(value))
  assert.equal(conversationCursor('42'),42)
  assert.equal(conversationCursor(null),null)
  for (const value of ['-1','1.2','id.eq.secret','9007199254740992']) assert.throws(() => conversationCursor(value))
})
test('conversation polling starts every 30 seconds, stops when hidden and releases timers when closed', () => {
  let listener, refreshes = 0, nextId = 0
  const active = new Map()
  const page = { visibilityState: 'visible', addEventListener(event,fn) { listener = fn }, removeEventListener(event,fn) { assert.equal(listener,fn); listener = null } }
  const timers = { setInterval(fn,ms) { assert.equal(ms,30000); active.set(++nextId,fn); return nextId }, clearInterval(id) { active.delete(id) } }
  const close = watchConversation(() => refreshes++,page,timers)
  assert.equal(refreshes,1); assert.equal(active.size,1)
  for (const tick of active.values()) tick()
  assert.equal(refreshes,2)
  page.visibilityState = 'hidden'; listener()
  assert.equal(active.size,0); assert.equal(refreshes,2)
  page.visibilityState = 'visible'; listener()
  assert.equal(active.size,1); assert.equal(refreshes,3)
  close(); assert.equal(active.size,0); assert.equal(listener,null)
})
function server({ profile = { role: 'store', store_id: 'store-a' }, authenticated = true, result = { data: { id: 61, duplicate: false }, error: null }, emailThrows = false, messageCount = 0 } = {}) {
  const queries = [], calls = [], emails = []
  const thread = { status: 'open', team: 'store', assigned_user: 'employee-a', revision: 3, last_message_id: messageCount, last_staff_message_id: messageCount, customer_read_id: 0 }
  const messages = Array.from({ length: messageCount },(_,i) => ({ id: i+1, body: 'Message '+(i+1), sender_kind: 'customer', created_at: '2026-10-02T10:00:00Z' }))
  const admin = { from(table) {
    const filters = []; let ascending = true
    queries.push(table)
    const query = { select() { return this }, or() { return this }, eq(key,value) { filters.push(['eq',key,value]); return this }, gt(key,value) { filters.push(['gt',key,value]); return this }, lt(key,value) { filters.push(['lt',key,value]); return this }, in() { return this }, order(key,options) { ascending = options.ascending; return this }, async limit(limit) {
      let rows = messages.filter(m => filters.every(([op,key,value]) => op === 'gt' ? m[key] > value : op === 'lt' ? m[key] < value : key === 'order_id' || m[key] === value))
      rows = [...rows].sort((a,b) => ascending ? a.id-b.id : b.id-a.id)
      return { data: rows.slice(0,limit), error: null }
    }, async single() { return { data: table === 'orders' && filters.every(([,key,value]) => order[key] === value) ? order : table === 'profiles' ? profile : null, error: null } }, async maybeSingle() { return { data: table === 'order_conversations' ? thread : null, error: null } }, then(resolve) { return Promise.resolve({ data: [{ id: 'employee-a', full_name: 'Own store', role: 'store', store_id: 'store-a' },{ id: 'employee-b', full_name: 'Other store', role: 'store', store_id: 'store-b' }], error: null }).then(resolve) } }
    return query
  }, async rpc(name,payload) { calls.push({ name,payload }); return result } }
  const user = { auth: { getUser: async () => ({ data: { user: authenticated ? { id: 'employee-a' } : null } }) }, from: () => ({ select() { return this }, eq() { return this }, single: async () => ({ data: profile }) }) }
  const route = load('lib/order-conversation-server.ts', {
    'server-only': {}, '@/lib/supabase/admin': { createAdminClient: () => admin }, '@/lib/supabase/server': { createClient: async () => user },
    '@/lib/order-conversation-mail': { notifyConversationMessage: async (o,customer) => { emails.push({ o,customer }); if (emailThrows) throw new Error('transport'); return { failed: 0 } } },
  })
  return { ...route, queries,calls,emails }
}
const request = (body) => new NextRequest('https://app.example/api/conversation',{ method: 'POST', headers: { origin: 'https://app.example' }, body: JSON.stringify(body) })
const message = { action: 'send', body: 'Mijn vraag', nonce: '00000000-0000-4000-8000-000000000001' }
test('customer summary requests do not download messages or expose employee assignment', async () => {
  const route = server({ messageCount: 2 })
  const response = await route.getConversation(new NextRequest('https://app.example/api?summary=1'),'secret-a',true)
  const data = await response.json()
  assert.equal(response.status,200); assert.equal(data.unread,true)
  assert.equal(data.thread.assigned_user,undefined); assert.equal(data.thread.team,undefined)
  assert.equal(data.messages,undefined); assert.ok(!route.queries.includes('order_messages'))
})
test('conversation message pagination loads only 50 messages and keeps cursors in order', async () => {
  const route = server({ messageCount: 60 })
  const latest = await (await route.getConversation(new NextRequest('https://app.example/api'),'secret-a',true)).json()
  assert.equal(latest.messages.length,50); assert.equal(latest.messages[0].id,11); assert.equal(latest.messages.at(-1).id,60); assert.equal(latest.moreBefore,true)
  const older = await (await route.getConversation(new NextRequest('https://app.example/api?before=11'),'secret-a',true)).json()
  assert.deepEqual(older.messages.map(m => m.id),[1,2,3,4,5,6,7,8,9,10]); assert.equal(older.moreBefore,false)
  const fresh = await (await route.getConversation(new NextRequest('https://app.example/api?after=55'),'secret-a',true)).json()
  assert.deepEqual(fresh.messages.map(m => m.id),[56,57,58,59,60])
})
test('invalid tokens and unauthorized employees cannot read or send in another order conversation', async () => {
  const invalid = server()
  assert.equal((await invalid.getConversation(new NextRequest('https://app.example/api'),'secret-b',true)).status,404)
  assert.equal((await invalid.postConversation(request(message),'secret-b',true)).status,404)
  assert.equal(invalid.calls.length,0)
  const otherStore = server({ profile: { role: 'store',store_id: 'store-b' } })
  assert.equal((await otherStore.postConversation(request(message),'order-a',false)).status,404)
  assert.equal(otherStore.calls.length,0)
  const loggedOut = server({ authenticated: false })
  assert.equal((await loggedOut.getConversation(new NextRequest('https://app.example/api'),'order-a',false)).status,401)
})
test('customer messages cannot spoof employee identity and duplicate retries never resend mail', async () => {
  const route = server()
  const response = await route.postConversation(request({ ...message, actor: 'employee-b', order_id: 'order-b' }),'secret-a',true)
  assert.equal(response.status,200)
  assert.equal(route.calls[0].payload.p_actor,null); assert.equal(route.calls[0].payload.p_token,'secret-a'); assert.equal(route.calls[0].payload.p_order,'order-a')
  assert.equal(route.emails.length,1); assert.equal(route.emails[0].customer,true)
  const duplicate = server({ result: { data: { id: 61, duplicate: true }, error: null } })
  assert.equal((await duplicate.postConversation(request(message),'secret-a',true)).status,200)
  assert.equal(duplicate.emails.length,0)
})
test('saved replies remain successful when email fails; spam limits and assignment conflicts remain actionable', async () => {
  const failedMail = server({ emailThrows: true })
  const response = await failedMail.postConversation(request(message),'order-a',false)
  assert.equal(response.status,200); assert.equal((await response.json()).emailFailed,true)
  assert.equal(failedMail.calls[0].payload.p_actor,'employee-a'); assert.equal(failedMail.emails[0].customer,false)
  for (const [code,status] of [['P0001',429],['40001',409],['42501',403]]) {
    const route = server({ result: { data: null, error: { code,message: 'Retry' } } })
    assert.equal((await route.postConversation(request(message),'secret-a',true)).status,status)
    assert.equal(route.emails.length,0)
  }
})
test('customer assignment, blank messages, cross-origin writes and oversized bodies are rejected', async () => {
  const route = server()
  for (const body of [{ ...message, body: ' ' }, { action: 'manage' }, { ...message, nonce: 'invalid' }]) assert.equal((await route.postConversation(request(body),'secret-a',true)).status,400)
  const crossOrigin = new NextRequest('https://app.example/api',{ method: 'POST',headers: { origin: 'https://other.example' },body: JSON.stringify(message) })
  assert.equal((await route.postConversation(crossOrigin,'secret-a',true)).status,403)
  assert.equal((await route.postConversation(request({ ...message, body: 'x'.repeat(25000) }),'secret-a',true)).status,413)
  assert.equal(route.calls.length,0)
})
test('employee assignment lists exclude other stores and assignment notifies the new owner for pending questions', async () => {
  const route = server({ result: { data: { notify: true }, error: null } })
  const data = await (await route.getConversation(new NextRequest('https://app.example/api'),'order-a',false)).json()
  assert.deepEqual(data.assignees.map(p => p.id),['employee-a'])
  const response = await route.postConversation(request({ action: 'manage',revision: 3,team: 'store',status: 'open',assigned_user: null }),'order-a',false)
  assert.equal(response.status,200); assert.equal(route.emails.length,1); assert.equal(route.emails[0].customer,true)
})

function conversationMailer(assignment = { assigned_user: null,team: 'store' }) {
  const deliveries = []
  const profiles = [{ id: 'own',role: 'store',store_id: 'store-a' },{ id: 'other',role: 'store',store_id: 'store-b' },{ id: 'office',role: 'office',store_id: null },{ id: 'print',role: 'print',store_id: null }]
  const admin = { from() {
    let roles, id, store
    return { select() { return this }, in(key,value) { roles = value; return this }, eq(key,value) { if (key === 'id') id = value; if (key === 'store_id') store = value; return this }, async single() { return { data: assignment,error: null } }, then(resolve) { return Promise.resolve({ data: profiles.filter(p => (!roles || roles.includes(p.role)) && (!id || p.id === id) && (!store || p.store_id === store)),error: null }).then(resolve) } }
  }, auth: { admin: { getUserById: async id => ({ data: { user: { email: id + '@example.invalid' } }, error: null }) } } }
  const { notifyConversationMessage } = load('lib/order-conversation-mail.ts', {
    'server-only': {}, '@/lib/supabase/admin': { createAdminClient: () => admin }, '@/lib/public-url': { getPublicAppUrl: () => 'https://app.example' },
    '@/lib/order-notifications': { sendConversationEmail: async (to,o,customer) => { deliveries.push({ to,o,customer }); return { skipped: false } } },
  })
  return { deliveries,notifyConversationMessage }
}
test('question mail follows the assigned person or team and never includes employees from other stores', async () => {
  for (const [assignment,expected] of [[{ team: 'store',assigned_user: null },'own'],[{ team: 'store',assigned_user: 'print' },'print'],[{ team: 'print',assigned_user: null },'print'],[{ team: 'store',assigned_user: 'other' },'own']]) {
    const mailer = conversationMailer(assignment)
    await mailer.notifyConversationMessage(order,true)
    assert.deepEqual(mailer.deliveries.map(d => d.to),[expected+'@example.invalid'])
    assert.equal(mailer.deliveries[0].customer,false)
  }
})
test('reply emails go only to the order customer; answers remain available without an email address', async () => {
  const mailer = conversationMailer()
  await mailer.notifyConversationMessage(order,false)
  assert.deepEqual(mailer.deliveries.map(d => d.to),[order.customer_email])
  assert.equal(mailer.deliveries[0].customer,true)
  assert.equal((await mailer.notifyConversationMessage({ ...order,customer_email: null },false)).skipped,true)
  assert.equal(mailer.deliveries.length,1)
})
