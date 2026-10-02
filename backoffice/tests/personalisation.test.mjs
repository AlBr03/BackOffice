import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { load } from './load-ts.mjs'
const { emptyPersonalisation, emptyPrintRow, personalisationError, parsePrintPaste } = load('lib/personalisation.ts')
const { normalizeProductLines } = load('lib/order-fields.ts')
const { PersonalisationTable } = load('components/personalisation-table.tsx')

test('personalisation quantities include identical garments and must match their article size line', () => {
  const p = emptyPersonalisation()
  p.rows = [{ ...emptyPrintRow(), initials: 'JD', number: '07' }, { ...emptyPrintRow(), quantity: 3 }]
  assert.equal(personalisationError(p, 4), null)
  assert.match(personalisationError(p, 5), /5 artikelen/)
  p.rows[0].quantity = 1.5
  assert.match(personalisationError(p, 4), /geheel/)
})
test('extra columns retain arbitrary text and reject unknown keys, duplicates and blank labels', () => {
  const p = { ...emptyPersonalisation(), columns: [{ id: 'field_colour', label: 'Printkleur' }], rows: [{ ...emptyPrintRow(), extra: { field_colour: 'Goud' } }] }
  assert.equal(personalisationError(p, 1), null)
  assert.match(personalisationError({ ...p, columns: [...p.columns, ...p.columns] }, 1), /unieke/)
  assert.match(personalisationError({ ...p, columns: [{ id: 'field_colour', label: '' }] }, 1), /naam/)
  assert.match(personalisationError({ ...p, columns: [] }, 1), /Onbekende/)
  assert.match(personalisationError({ ...p, rows: [{ ...p.rows[0], name: 'x'.repeat(1001) }] }, 1), /1000/)
})
test('Excel paste preserves leading zero player numbers, imports extra fields and rejects other sizes', () => {
  const rows = parsePrintPaste('Maat\tAantal\tInitialen\tRugnummer\tNaam\tPrintnotities\tKleur\r\nM\t1\tJD\t07\tJansen\tBorst\tGoud\r\nM\t3\t\t\t\tClublogo\tWit', 'M', [{ id: 'field_colour', label: 'Kleur' }])
  assert.equal(rows[0].number, '07')
  assert.equal(rows[0].extra.field_colour, 'Goud')
  assert.equal(rows[1].quantity, 3)
  assert.throws(() => parsePrintPaste('L\t1', 'M', []), /aparte productregel/)
  assert.throws(() => parsePrintPaste('M\t1.5', 'M', []), /ongeldig aantal/)
})
test('normalizing product lines preserves their personalisation independently', () => {
  const p = { ...emptyPersonalisation(), rows: [emptyPrintRow()] }
  const lines = normalizeProductLines([{ product: ' Shirt ', productCode: ' A ', size: ' M ', quantity: 1, personalisation: p }, { product: 'Short', productCode: '', size: 'S', quantity: 1 }])
  assert.deepEqual(lines[0].personalisation, p)
  assert.equal(lines[1].personalisation, undefined)
})
test('customer and production table render custom columns, size totals and safely escaped values', () => {
  const value = { ...emptyPersonalisation(), instructions: 'Logo links', columns: [{ id: 'field_colour', label: 'Kleur' }], rows: [{ ...emptyPrintRow(), initials: '<script>', extra: { field_colour: 'Goud' } }] }
  const html = renderToStaticMarkup(createElement(PersonalisationTable, { value, size: 'M', quantity: 1 }))
  assert.match(html, /Kleur/); assert.match(html, /Goud/); assert.match(html, /Logo links/)
  assert.match(html, /&lt;script&gt;/); assert.match(html, /maat M/); assert.match(html, /totaal 1/)
})

function proofRoute({ updated = true } = {}) {
  const writes = []
  const client = { from(table) {
    if (table === 'orders') {
      const query = { select() { return this }, eq(key, value) { writes.push([key, value]); return this }, update(value) { writes.push(value); return this }, async single() { return { data: { id: 'order-id', has_print: true, personalisation_version: 3, order_number: '100001' }, error: null } }, async maybeSingle() { return { data: updated ? { id: 'order-id' } : null, error: null } } }
      return query
    }
    if (table === 'order_files') return { select() { return this }, eq() { return this }, not() { return this }, async limit() { return { data: [{ id: 'proof' }] } } }
    if (table === 'profiles') return { select() { return this }, eq() { return this }, then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve) } }
    return { async insert(value) { writes.push(value); return { error: null } } }
  } }
  const { POST } = load('app/api/public/orders/[token]/proof/route.ts', {
    '@/lib/supabase/admin': { createAdminClient: () => client },
    '@/lib/order-notifications': { sendPrintProofReviewedEmail: async () => { throw new Error('No recipient in this test') } },
    '@/lib/public-url': { getPublicAppUrl: () => 'https://example.invalid' },
  })
  return { writes, POST }
}
test('customer approval rejects stale or missing personalisation revisions before writing', async () => {
  for (const version of [2, undefined]) {
    const { POST, writes } = proofRoute()
    const result = await POST(new Request('https://example.invalid', { method: 'POST', body: JSON.stringify({ status: 'approved', personalisationVersion: version }) }), { params: Promise.resolve({ token: 'token' }) })
    assert.equal(result.status, 409)
    assert.ok(!writes.some(value => value.print_proof_status))
  }
})
test('customer approval checks revision again during write and rejects a concurrent edit', async () => {
  const { POST, writes } = proofRoute({ updated: false })
  const result = await POST(new Request('https://example.invalid', { method: 'POST', body: JSON.stringify({ status: 'approved', personalisationVersion: 3 }) }), { params: Promise.resolve({ token: 'token' }) })
  assert.equal(result.status, 409)
  assert.ok(writes.some(v => Array.isArray(v) && v[0] === 'personalisation_version' && v[1] === 3))
  assert.ok(!writes.some(v => v.action_type))
})
test('customer approval with current revision records the decision', async () => {
  const { POST, writes } = proofRoute()
  const result = await POST(new Request('https://example.invalid', { method: 'POST', body: JSON.stringify({ status: 'approved', personalisationVersion: 3 }) }), { params: Promise.resolve({ token: 'token' }) })
  assert.equal(result.status, 200)
  assert.ok(writes.some(v => v.print_proof_status === 'approved'))
  assert.ok(writes.some(v => v.action_type === 'print_proof_approved'))
})
