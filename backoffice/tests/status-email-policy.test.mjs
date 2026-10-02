import { test } from 'node:test'
import assert from 'node:assert/strict'
import { load } from './load-ts.mjs'
const { hasArrivalChange, suppressCustomerArrivalEmail } = load('lib/status-email-policy.ts')
const sent = []
const mail = load('lib/order-notifications.ts', {
  '@/lib/dropdown-settings-server': { loadDropdownSettings: async () => ({ settings: load('lib/dropdown-settings.ts').defaultDropdownSettings() }) },
  '@/lib/send-business-mail': { sendBusinessMail: async (event, order, message) => { sent.push({ event, message }); return { skipped: false } } },
})
const initial = { order_number: '100001', customer_email: 'customer@example.invalid', club_name: 'Club', article_status: 'ordered', print_status: 'logos_ordered', has_print: true, store_id: 'store-a', id: 'order-id' }
test('arrival changes suppress generic customer mail but preserve pickup and completion', async () => {
  sent.length = 0
  const articles = { ...initial, article_status: 'at_location' }
  const logos = { ...initial, print_status: 'logos_at_location' }
  for (const order of [articles, logos]) {
    assert.equal(hasArrivalChange(initial, order), true)
    assert.equal(suppressCustomerArrivalEmail(order, initial), true)
    assert.equal((await mail.sendOrderStatusChangedEmail(order, 'Op locatie', initial)).skipped, true)
  }
  assert.equal(sent.length, 0)
  assert.equal(mail.shouldSendOrderReadyForPickupEmail(articles), false)
  assert.equal(mail.shouldSendOrderReadyForPickupEmail({ ...articles, print_status: 'completed' }), true)
  assert.equal(mail.shouldSendOrderReadyForPickupEmail({ ...articles, has_print: false }), true)
  assert.equal(mail.shouldSendOrderCompletedEmail({ ...initial, article_status: 'completed' }), true)
})
test('other transitions are still mailed even while the other workflow is at location', async () => {
  sent.length = 0
  const previous = { ...initial, article_status: 'at_location', print_status: 'new' }
  const next = { ...previous, print_status: 'logos_ordered' }
  assert.equal(hasArrivalChange(previous, next), false)
  assert.equal(suppressCustomerArrivalEmail(next, previous), false)
  await mail.sendOrderStatusChangedEmail(next, 'Logo’s besteld', previous)
  assert.equal(sent[0].message.to, initial.customer_email)
  assert.equal(sent[0].event, 'status_changed')
})
test('legacy customer notification calls also suppress arrival status messages', async () => {
  assert.equal((await mail.sendOrderStatusChangedEmail({ ...initial, print_status: 'logos_at_location' }, 'Op locatie')).skipped, true)
})
test('internal arrival recipients exclude other stores, include print for print orders and deduplicate addresses', async () => {
  const deliveries = []
  const profiles = [{ id: 'own', role: 'store', store_id: 'store-a' }, { id: 'other', role: 'store_manager', store_id: 'store-b' }, { id: 'office', role: 'office', store_id: null }, { id: 'duplicate', role: 'admin', store_id: null }, { id: 'print', role: 'print', store_id: null }]
  const client = { from() { return { select() { return this }, async in(key, roles) { return { data: profiles.filter(p => roles.includes(p.role)), error: null } } } }, auth: { admin: { async getUserById(id) { return { data: { user: { email: id === 'duplicate' ? 'OFFICE@example.invalid' : id + '@example.invalid' } }, error: null } } } } }
  const { notifyInternalArrival } = load('lib/internal-arrival-notifications.ts', {
    'server-only': {}, '@/lib/supabase/admin': { createAdminClient: () => client },
    '@/lib/public-url': { getPublicAppUrl: () => 'https://app.example' },
    '@/lib/order-notifications': { sendInternalArrivalEmail: async (to, order) => { deliveries.push({ to, order }); return { skipped: false } } },
  })
  const result = await notifyInternalArrival(initial, 'Aankomst')
  assert.equal(result.sent, 3)
  assert.deepEqual(deliveries.map(d => d.to).sort(), ['office@example.invalid','own@example.invalid','print@example.invalid'])
  assert.equal(deliveries[0].order.order_detail_url, 'https://app.example/dashboard/orders/order-id')
  deliveries.length = 0
  await notifyInternalArrival({ ...initial, has_print: false }, 'Aankomst')
  assert.equal(deliveries.some(d => d.to.startsWith('print')), false)
})
