import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { load } from './load-ts.mjs'

const rules = load('lib/business-settings.ts')
const defaults = () => rules.defaultBusinessSettings()
const personalDefaults = () => rules.defaultPersonalSettings()
const dropdownDefaults = load('lib/dropdown-settings.ts').defaultDropdownSettings
const storeId = '00000000-0000-4000-8000-000000000001'

test('standard business rules preserve current reminder timings, permissions and order defaults', () => {
  const settings = rules.validateBusinessSettings(defaults())
  assert.equal(settings.reminders.article_order.days, 3)
  assert.equal(settings.reminders.logo_order.days, 5)
  assert.equal(settings.reminders.article_arrival.days, 21)
  assert.equal(settings.defaults.reminderDays, 2)
  assert.equal(settings.defaults.responsibility, 'order_manager')
  assert.deepEqual(settings.required.create, [])
  assert.deepEqual(rules.mergeBusinessSettings({}), settings)
})

test('suppliers have stable IDs, unique names, validated contact details and appropriate defaults', () => {
  const settings = defaults()
  settings.suppliers.push({ id: 'supplier_one', name: 'Teamwear', kind: 'article', email: 'orders@example.com', phone: '', active: true })
  settings.defaults.supplier = 'supplier_one'
  assert.equal(rules.defaultSupplierName(rules.validateBusinessSettings(settings), 'supplier_one'), 'Teamwear')
  settings.suppliers[0].active = false
  assert.throws(() => rules.validateBusinessSettings(settings), /standaardleverancier/)
  settings.defaults.supplier = ''
  assert.equal(rules.defaultSupplierName(rules.validateBusinessSettings(settings), 'supplier_one'), '')
  settings.suppliers.push({ ...settings.suppliers[0], id: 'supplier_two' })
  assert.throws(() => rules.validateBusinessSettings(settings), /dubbele leverancier/)
})

test('store defaults override company defaults and leave other stores on company defaults', () => {
  const settings = defaults()
  settings.stores[storeId] = { name: 'Winkel', email: '', phone: '', address: '', openingHours: '', signature: '', defaults: { ...settings.defaults, responsibility: 'store_manager', reminderDays: 5 } }
  const saved = rules.validateBusinessSettings(settings)
  assert.equal(rules.orderDefaults(saved, storeId).responsibility, 'store_manager')
  assert.equal(rules.orderDefaults(saved, 'another').reminderDays, 2)
})

test('required-field checks account for print orders, out-of-stock articles and state transitions', () => {
  const settings = defaults()
  settings.required.create = ['customer_email', 'print_supplier', 'expected_article_delivery_date']
  settings.required.transitions['article:completed'] = ['delivery_date']
  assert.deepEqual(rules.missingRequiredFields(settings, { has_print: false, article_out_of_stock: false }), ['customer_email'])
  assert.deepEqual(rules.missingRequiredFields(settings, { has_print: true, article_out_of_stock: true }), ['customer_email', 'print_supplier', 'expected_article_delivery_date'])
  assert.deepEqual(rules.missingRequiredFields(settings, {}, 'article:completed'), ['delivery_date'])
})

test('invalid workflow fields, recipient roles, template placeholders and timing bounds are rejected', () => {
  for (const update of [
    (settings) => { settings.required.create = ['arbitrary_field'] },
    (settings) => { settings.reminders.logo_order.days = 366 },
    (settings) => { settings.reminders.article_order.recipients = ['customer'] },
    (settings) => { settings.emails.created.subject = '{{password}}' },
    (settings) => { settings.emails.created.subject = 'Hello\nBcc: attacker@example.com' },
    (settings) => { settings.company.brandColor = 'javascript:evil' },
    (settings) => { settings.notifications.created.roles = [] },
    (settings) => { settings.reminders.article_order.recipients = [] },
  ]) { const settings = defaults(); update(settings); assert.throws(() => rules.validateBusinessSettings(settings)) }
})

const reminder = load('lib/reminder-rules.ts')
const candidate = { article_status: 'new', print_status: 'new', article_order_responsibility: 'order_manager', has_print: true, logo_action: 'bestellen', created_at: '2026-09-25T12:00:00Z' }
const now = new Date('2026-10-02T12:00:00Z')
test('configured reminder windows and disable switches determine which reminders are due', () => {
  const settings = defaults()
  assert.deepEqual(reminder.reminderKinds(candidate, now, settings), ['article_order', 'logo_order'])
  settings.reminders.article_order.days = 8
  settings.reminders.logo_order.enabled = false
  assert.deepEqual(reminder.reminderKinds(candidate, now, settings), [])
  settings.reminders.article_order.days = 0
  assert.deepEqual(reminder.reminderKinds({ ...candidate, article_order_reminder_sent_at: now.toISOString() }, now, settings), [])
  assert.deepEqual(reminder.reminderKinds({ ...candidate, created_at: 'invalid' }, now, settings), [])
})

test('per-order delivery reminder terms remain authoritative and completed orders are excluded', () => {
  const settings = defaults()
  const order = { ...candidate, article_status: 'ordered', logo_action: 'aanwezig', article_out_of_stock: true, expected_article_delivery_date: '2026-10-05T12:00:00Z' }
  settings.reminders.article_delivery.days = 4
  assert.deepEqual(reminder.reminderKinds(order, now, settings), ['article_delivery'])
  assert.deepEqual(reminder.reminderKinds({ ...order, article_delivery_reminder_days_before: 1 }, now, settings), [])
  assert.deepEqual(reminder.reminderKinds({ ...order, article_status: 'completed' }, now, settings), [])
})

test('notification preferences intersect allowed company roles and individual event choices', () => {
  const settings = defaults(), personal = personalDefaults()
  settings.notifications.created.roles = ['office']
  personal.notifications = ['created', 'status_changed']
  assert.deepEqual(rules.visibleNotificationEvents(settings, personal, 'store'), ['status_changed'])
  settings.notifications.status_changed.enabled = false
  assert.deepEqual(rules.visibleNotificationEvents(settings, personal, 'store'), [])
  assert.deepEqual(rules.visibleNotificationEvents(settings, personal, 'office'), ['created'])
})

test('personal preferences validate sorting/filter values and preserve the order column', () => {
  const personal = personalDefaults()
  assert.doesNotThrow(() => rules.validatePersonalSettings(personal))
  personal.dashboard.columns = ['customer']
  assert.throws(() => rules.validatePersonalSettings(personal), /orderkolom/)
  personal.dashboard.columns = ['order']
  personal.dashboard.sort = 'sql_expression'
  assert.throws(() => rules.validatePersonalSettings(personal))
  personal.dashboard.sort = '__proto__'
  assert.throws(() => rules.validatePersonalSettings(personal))
})

const mail = load('lib/email-settings.ts')
test('custom emails resolve placeholders, use store contact overrides and escape HTML', () => {
  const settings = defaults()
  settings.company.signature = 'Bedankt, {{company}}'
  settings.stores[storeId] = { name: 'Winkel', email: 'store@example.com', phone: '123', address: '', openingHours: '', signature: 'Het winkelteam', defaults: null }
  settings.emails.created = { enabled: true, subject: 'Order {{order_number}} voor {{customer}}', body: 'Beste {{customer}},\n{{signature}}' }
  const values = mail.emailTemplateValues(settings, { order_number: 'ORD-1', club_name: '<script>alert(1)</script>', store_id: storeId, article_status: 'new', print_status: 'new', order_items: [{ product: 'Shirt', quantity: 5, product_code: null }] }, 'https://example.com/order/1')
  const result = mail.configuredEmail(settings, 'created', values, { subject: 'original', text: 'original', html: 'original' })
  assert.match(result.subject, /ORD-1/)
  assert.match(result.text, /Het winkelteam/)
  assert.match(result.text, /5x Shirt/)
  assert.match(result.html, /&lt;script&gt;/)
  assert.doesNotMatch(result.html, /<script>/)
  assert.equal(values.contact_email, 'store@example.com')
})

test('unchanged templates retain existing messages and header-injection characters are sanitized', () => {
  const settings = defaults()
  const values = mail.emailTemplateValues(settings, { order_number: '1', club_name: 'Customer\r\nBcc: test', article_status: 'new', print_status: null }, '')
  const original = { subject: 'Original subject', text: 'Original text', html: '<p>Original text</p>' }
  assert.deepEqual(mail.configuredEmail(settings, 'created', values, original), original)
  settings.emails.created.subject = '{{customer}}'
  assert.doesNotMatch(mail.configuredEmail(settings, 'created', values, original).subject, /[\r\n]/)
})

test('outgoing mail uses system settings without an employee session and disabled mails never send', async () => {
  const settings = defaults(), sent = []
  const { sendBusinessMail } = load('lib/send-business-mail.ts', {
    'server-only': {},
    '@/lib/business-settings-server': { loadBusinessSettingsForSystem: async () => ({ settings }) },
    '@/lib/dropdown-settings-server': { loadDropdownSettings: async () => ({ settings: dropdownDefaults() }) },
    '@/lib/public-url': { getPublicOrderTrackingUrl: () => 'https://example.com/order/1' },
    '@/lib/mail': { sendMail: async (message) => { sent.push(message); return { skipped: false } } },
  })
  const order = { order_number: '1', club_name: 'Team', article_status: 'new', print_status: 'new' }
  settings.emails.created.enabled = false
  assert.equal((await sendBusinessMail('created', order, { to: 'customer@example.com', subject: 'Subject', text: 'Text' })).skipped, true)
  assert.equal(sent.length, 0)
  settings.emails.created.enabled = true
  settings.emails.created.subject = 'Aangepast {{order_number}}'
  await sendBusinessMail('created', order, { to: 'customer@example.com', subject: 'Subject', text: 'Text' })
  assert.equal(sent[0].subject, 'Aangepast 1')
})

test('every real email template can be previewed without contacting the mail transport', async () => {
  let sends = 0
  const mocks = {
    'server-only': {},
    '@/lib/dropdown-settings-server': { loadDropdownSettings: async () => ({ settings: dropdownDefaults() }) },
    '@/lib/business-settings-server': { loadBusinessSettingsForSystem: async () => { throw new Error('A preview must use its draft instead of saved settings') } },
    '@/lib/public-url': { getPublicOrderTrackingUrl: () => 'https://example.invalid/order/preview' },
    '@/lib/mail': { sendMail: async () => { sends++; throw new Error('A preview must never send mail') } },
  }
  const { renderEmailPreview } = load('lib/email-preview-server.ts', mocks)
  for (const event of Object.keys(rules.EMAIL_NAMES)) {
    const settings = defaults()
    settings.emails[event].enabled = false
    const result = await renderEmailPreview(settings, event)
    assert.match(result.subject, /ORD-VOORBEELD/)
    assert.match(result.html, /Voorbeeldvereniging/)
  }
  assert.equal(sends, 0)
})

test('parallel email previews isolate drafts and render customized subjects correctly', async () => {
  const { renderEmailPreview } = load('lib/email-preview-server.ts', {
    'server-only': {},
    '@/lib/dropdown-settings-server': { loadDropdownSettings: async () => ({ settings: dropdownDefaults() }) },
    '@/lib/business-settings-server': { loadBusinessSettingsForSystem: async () => { throw new Error('Unexpected database read') } },
    '@/lib/public-url': { getPublicOrderTrackingUrl: () => 'https://example.invalid/order/preview' },
    '@/lib/mail': { sendMail: async () => { throw new Error('Unexpected mail send') } },
  })
  const first = defaults(), second = defaults()
  first.emails.created.subject = 'First {{order_number}}'; second.emails.created.subject = 'Second {{order_number}}'
  const results = await Promise.all([renderEmailPreview(first, 'created'), renderEmailPreview(second, 'created')])
  assert.equal(results[0].subject, 'First ORD-VOORBEELD')
  assert.equal(results[1].subject, 'Second ORD-VOORBEELD')
})

test('order creation renders configured store defaults, supplier choices and mandatory fields', () => {
  const settings = defaults(), cache = new Map()
  settings.suppliers.push({ id: 'supplier_team', name: 'Teamwear', kind: 'both', email: '', phone: '', active: true })
  settings.stores[storeId] = { name: 'Winkel', email: '', phone: '', address: '', openingHours: '', signature: '', defaults: { supplier: 'supplier_team', printSupplier: 'supplier_team', responsibility: 'store_manager', reminderDays: 4 } }
  settings.required.create = ['customer_email', 'accepted_by']
  const mocks = { 'next/navigation': { useRouter: () => ({ refresh() {}, push() {} }) }, '@/lib/supabase/client': { createClient: () => ({}) } }
  const { BusinessProvider } = load('components/business-provider.tsx', mocks, cache)
  const { DropdownProvider } = load('components/dropdown-provider.tsx', mocks, cache)
  const { OrderForm } = load('components/order-form.tsx', mocks, cache)
  const html = renderToStaticMarkup(createElement(BusinessProvider, { business: settings, personal: personalDefaults() }, createElement(DropdownProvider, { settings: dropdownDefaults(), canManage: false }, createElement(OrderForm, { role: 'store', storeId, stores: [{ id: storeId, name: 'Winkel' }] }))))
  assert.match(html, /value="Teamwear"/)
  assert.match(html, /value="store_manager" selected=""/)
  assert.match(html, /placeholder="E-mailadres klant"[^>]*required=""/)
})

test('dashboard columns follow personal choices while store-role restrictions remain intact', () => {
  const cache = new Map(), mocks = { 'next/navigation': { useRouter: () => ({ refresh() {} }) }, 'next/link': { __esModule: true, default: ({ children, href }) => createElement('a', { href }, children) } }
  const { BusinessProvider } = load('components/business-provider.tsx', mocks, cache)
  const { DashboardLiveTable } = load('components/dashboard-live-table.tsx', mocks, cache)
  const personal = personalDefaults()
  personal.dashboard.columns = ['order', 'store', 'customer']
  const html = renderToStaticMarkup(createElement(BusinessProvider, { business: defaults(), personal }, createElement(DashboardLiveTable, { orders: [], showStoreColumn: false })))
  assert.match(html, /<th>Order<\/th>/)
  assert.match(html, /<th>Klant<\/th>/)
  assert.doesNotMatch(html, /<th>Winkel<\/th>|<th>Product<\/th>/)
  assert.match(html, /colSpan="2"/i)
})

function businessRoute({ role = 'office', loggedIn = true, version = 0, missing = false, race = false, current = defaults(), dropdowns = dropdownDefaults() } = {}) {
  const writes = []
  const client = {
    auth: { getUser: async () => ({ data: { user: loggedIn ? { id: 'user-1' } : null } }) },
    from(table) {
      if (table === 'stores') return { select: async () => ({ data: [{ id: storeId }], error: null }) }
      const filters = {}, query = {
        select: () => query,
        eq: (key, value) => { filters[key] = value; return query },
        single: async () => table === 'profiles' ? { data: { role } } : { data: missing ? null : { settings: current, version }, error: missing ? {} : null },
        update: (payload) => { writes.push({ payload, filters }); return query },
        maybeSingle: async () => ({ data: race ? null : { version: version + 1 }, error: null }),
      }
      return query
    },
  }
  return { writes, route: load('app/api/settings/business/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/supabase/server': { createClient: async () => client },
    '@/lib/dropdown-settings-server': { loadDropdownSettings: async () => ({ settings: dropdowns }) },
  }) }
}
const request = (settings = defaults(), version = 0) => new Request('http://localhost/api/settings/business', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings, version }) })

test('shared settings API restricts management to admin and office and validates before writing', async () => {
  assert.equal((await businessRoute({ loggedIn: false }).route.PUT(request())).status, 401)
  for (const role of ['order_manager', 'print', 'store']) assert.equal((await businessRoute({ role }).route.PUT(request())).status, 403)
  const { route, writes } = businessRoute()
  const settings = defaults(); settings.reminders.article_order.days = -1
  assert.equal((await route.PUT(request(settings))).status, 400)
  assert.equal(writes.length, 0)
})

test('shared settings API detects stale saves, missing migrations and concurrent changes', async () => {
  assert.equal((await businessRoute({ version: 3 }).route.PUT(request())).status, 409)
  assert.equal((await businessRoute({ missing: true }).route.PUT(request())).status, 503)
  assert.equal((await businessRoute({ race: true }).route.PUT(request())).status, 409)
})

test('shared settings API prevents deleting saved suppliers and using hidden default responsibilities', async () => {
  const current = defaults(); current.suppliers.push({ id: 'supplier_existing', name: 'Existing', kind: 'both', email: '', phone: '', active: true })
  assert.equal((await businessRoute({ current }).route.PUT(request())).status, 400)
  const dropdowns = dropdownDefaults(); dropdowns.article_order_responsibility.find((option) => option.value === 'store_manager').enabled = false
  const settings = defaults(); settings.defaults.responsibility = 'store_manager'
  assert.equal((await businessRoute({ dropdowns }).route.PUT(request(settings))).status, 400)
})

test('shared settings API checks store references and saves with version and actor attribution', async () => {
  const { route, writes } = businessRoute({ role: 'admin' })
  const response = await route.PUT(request())
  assert.equal(response.status, 200)
  assert.deepEqual(writes[0].filters, { id: 1, version: 0 })
  assert.equal(writes[0].payload.updated_by, 'user-1')
  const settings = defaults(); settings.stores['00000000-0000-4000-8000-000000000099'] = { name: 'Missing', email: '', phone: '', address: '', openingHours: '', signature: '', defaults: null }
  assert.equal((await route.PUT(request(settings))).status, 400)
})

test('personal preference saves always target the authenticated account and set its theme cookie', async () => {
  const writes = [], cookies = []
  const client = { auth: { getUser: async () => ({ data: { user: { id: 'current-user' } } }) }, from: (table) => {
    assert.equal(table, 'user_preferences')
    return { upsert: async (row) => { writes.push(row); return { error: null } } }
  } }
  const { PUT } = load('app/api/settings/personal/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => Object.assign(Response.json(body, options), { cookies: { set: (...args) => cookies.push(args) } }) } },
    '@/lib/supabase/server': { createClient: async () => client },
  })
  const personal = personalDefaults(); personal.mode = 'dark'
  const response = await PUT(new Request('http://localhost/api/settings/personal', { method: 'PUT', body: JSON.stringify({ ...personal, user_id: 'another-user' }) }))
  assert.equal(response.status, 200)
  assert.equal(writes[0].user_id, 'current-user')
  assert.equal(cookies[0][0], 'ui-mode')
  assert.equal(cookies[0][1], 'dark')
})

test('personal preference API rejects logged-out users and invalid choices', async () => {
  const client = { auth: { getUser: async () => ({ data: { user: null } }) } }
  const mocks = { 'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } }, '@/lib/supabase/server': { createClient: async () => client } }
  const { PUT } = load('app/api/settings/personal/route.ts', mocks)
  assert.equal((await PUT(new Request('http://localhost', { method: 'PUT', body: '{}' }))).status, 401)
  client.auth.getUser = async () => ({ data: { user: { id: 'user' } } })
  assert.equal((await PUT(new Request('http://localhost', { method: 'PUT', body: '{}' }))).status, 400)
})
