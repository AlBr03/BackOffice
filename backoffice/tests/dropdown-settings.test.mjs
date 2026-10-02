import { load } from './load-ts.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const rules = load('lib/dropdown-settings.ts')
const fresh = () => rules.defaultDropdownSettings()

const { DropdownProvider, ConfiguredSelect, DropdownManagementAccess } = load('components/dropdown-provider.tsx')

test('rendered dropdowns use renamed labels, hide unused options and preserve selected options', () => {
  const settings = fresh()
  settings.article_status.find((option) => option.value === 'ordered').enabled = false
  settings.article_status.find((option) => option.value === 'new').label = 'Nieuw ontvangen'
  const render = (value) => renderToStaticMarkup(createElement(DropdownProvider, { settings, canManage: true },
    createElement(ConfiguredSelect, { dropdown: 'article_status', name: 'article_status', defaultValue: value })))
  assert.match(render('new'), /Nieuw ontvangen/)
  assert.doesNotMatch(render('new'), /value="ordered"/)
  assert.match(render('ordered'), /value="ordered" selected=""/)
  assert.match(render('legacy'), /value="legacy" selected=""/)
})

test('management links render only for users allowed to manage dropdowns', () => {
  const render = (canManage) => renderToStaticMarkup(createElement(DropdownProvider, { settings: fresh(), canManage },
    createElement(DropdownManagementAccess, null, 'Keuzelijsten')))
  assert.equal(render(true), 'Keuzelijsten')
  assert.equal(render(false), '')
})

test('default printvoorbeeld label changes without changing its workflow value', () => {
  const option = fresh().logo_action.find((entry) => entry.value === 'bestellen')
  assert.equal(option.label, 'Bestellen en drukvoorbeeld')
  assert.doesNotThrow(() => rules.validateDropdownSettings(fresh()))
})

test('only admin and office can manage dropdowns', () => {
  for (const role of ['admin', 'office']) assert.equal(rules.canManageDropdowns(role), true)
  for (const role of ['order_manager', 'store', 'store_manager', 'print', 'pending', null]) assert.equal(rules.canManageDropdowns(role), false)
})

test('renaming, reordering and hiding retain internal values and selected hidden options', () => {
  const settings = fresh()
  settings.article_status.reverse()
  const ordered = settings.article_status.find((entry) => entry.value === 'ordered')
  ordered.label = 'In bestelling'
  ordered.enabled = false
  const saved = rules.validateDropdownSettings(settings)
  assert.equal(rules.dropdownLabel(saved, 'article_status', 'ordered'), 'In bestelling')
  assert.equal(rules.dropdownOptions(saved, 'article_status').some((entry) => entry.value === 'ordered'), false)
  assert.equal(rules.dropdownOptions(saved, 'article_status', 'ordered').some((entry) => entry.value === 'ordered'), true)
  assert.equal(saved.article_status[0].value, 'completed')
})

test('unknown historical values remain selectable', () => {
  assert.equal(rules.dropdownOptions(fresh(), 'logo_action', 'legacy').at(-1).value, 'legacy')
})

test('free logo options require customer-facing text and stable custom IDs', () => {
  const settings = fresh()
  settings.logo_action.push({ value: 'custom_special', label: 'Speciale behandeling', enabled: true, customerLabel: 'Speciale behandeling', customerDescription: 'Neem contact op met de winkel.' })
  assert.equal(rules.validateDropdownSettings(settings).logo_action.at(-1).value, 'custom_special')
  settings.logo_action.at(-1).customerDescription = ''
  assert.throws(() => rules.validateDropdownSettings(settings), /klantnaam en klantomschrijving/)
})

test('workflow options cannot be added, removed, duplicated or blank', () => {
  for (const mutate of [
    (settings) => settings.role.push({ value: 'super_admin', label: 'Superbeheerder', enabled: true }),
    (settings) => settings.print_status.pop(),
    (settings) => settings.article_status.push({ ...settings.article_status[0] }),
    (settings) => { settings.article_status[0].label = ' ' },
  ]) {
    const settings = fresh()
    mutate(settings)
    assert.throws(() => rules.validateDropdownSettings(settings))
  }
})

test('required workflow options and at least one free option stay enabled', () => {
  const settings = fresh()
  settings.role.find((option) => option.value === 'admin').enabled = false
  assert.throws(() => rules.validateDropdownSettings(settings), /verplichte/)
  const other = fresh()
  other.logo_action.forEach((option) => { option.enabled = false })
  assert.throws(() => rules.validateDropdownSettings(other), /minstens/)
})

test('upgrades merge newly introduced defaults and reject corrupted settings', () => {
  const settings = fresh()
  settings.article_status.find((option) => option.value === 'ordered').label = 'Aangepast'
  settings.print_status.pop()
  const merged = rules.mergeDropdownSettings(settings)
  assert.equal(merged.article_status.find((option) => option.value === 'ordered').label, 'Aangepast')
  assert.equal(merged.print_status.at(-1).value, 'completed')
  assert.deepEqual(rules.mergeDropdownSettings({ role: 'broken' }), fresh())
  assert.deepEqual(rules.mergeDropdownSettings(null), fresh())
})

function routeFixture({ role = 'office', loggedIn = true, row = { options: fresh(), version: 0 }, race = false, unavailable = false } = {}) {
  const writes = []
  const client = {
    auth: { getUser: async () => ({ data: { user: loggedIn ? { id: 'user-1' } : null } }) },
    from(table) {
      if (table === 'profiles') {
        const query = { select: () => query, eq: () => query, single: async () => ({ data: { role } }) }
        return query
      }
      assert.equal(table, 'dropdown_settings')
      let payload
      const filters = {}
      const query = {
        select: () => query,
        eq: (key, value) => { filters[key] = value; return query },
        single: async () => ({ data: unavailable ? null : row, error: unavailable ? { code: '42P01' } : null }),
        update: (value) => { payload = value; return query },
        maybeSingle: async () => {
          writes.push({ payload, filters })
          return { data: race ? null : { version: payload.version }, error: null }
        },
      }
      return query
    },
  }
  return {
    writes,
    route: load('app/api/settings/dropdowns/route.ts', {
      'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
      '@/lib/supabase/server': { createClient: async () => client },
      '@/lib/business-settings-server': { loadBusinessSettings: async () => ({ settings: load('lib/business-settings.ts').defaultBusinessSettings() }) },
    }),
  }
}

const request = (settings = fresh(), version = 0) => new Request('http://localhost/api/settings/dropdowns', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings, version }) })

test('API blocks logged-out users and order managers before reading or writing settings', async () => {
  for (const [options, expected] of [[{ loggedIn: false }, 401], [{ role: 'order_manager' }, 403]]) {
    const { route, writes } = routeFixture(options)
    assert.equal((await route.GET()).status, expected)
    assert.equal((await route.PUT(request())).status, expected)
    assert.equal(writes.length, 0)
  }
})

test('API validates before writing and rejects malformed JSON', async () => {
  const { route, writes } = routeFixture()
  const settings = fresh()
  settings.role[0].label = ''
  assert.equal((await route.PUT(request(settings))).status, 400)
  const malformed = new Request('http://localhost/api/settings/dropdowns', { method: 'PUT', body: '{' })
  assert.equal((await route.PUT(malformed)).status, 400)
  assert.equal(writes.length, 0)
})

test('API reports a missing migration and protects against stale edits and write races', async () => {
  assert.equal((await routeFixture({ unavailable: true }).route.GET()).status, 503)
  assert.equal((await routeFixture({ unavailable: true }).route.PUT(request())).status, 503)
  assert.equal((await routeFixture({ row: { options: fresh(), version: 2 } }).route.PUT(request())).status, 409)
  assert.equal((await routeFixture({ race: true }).route.PUT(request())).status, 409)
})

test('API preserves previously saved custom options used by old orders', async () => {
  const settings = fresh()
  settings.logo_action.push({ value: 'custom_old', label: 'Oude optie', enabled: false, customerLabel: 'Oude optie', customerDescription: 'Oude omschrijving.' })
  const { route, writes } = routeFixture({ row: { options: settings, version: 0 } })
  assert.equal((await route.PUT(request())).status, 400)
  assert.equal(writes.length, 0)
})

test('API saves normalized settings with a version guard and author attribution', async () => {
  const { route, writes } = routeFixture({ role: 'admin' })
  const settings = fresh()
  settings.article_status[0].label = '  Nieuw ontvangen  '
  const response = await route.PUT(request(settings))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).version, 1)
  assert.deepEqual(writes[0].filters, { id: 1, version: 0 })
  assert.equal(writes[0].payload.options.article_status[0].label, 'Nieuw ontvangen')
  assert.equal(writes[0].payload.updated_by, 'user-1')
})
