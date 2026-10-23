import { test } from 'node:test'
import assert from 'node:assert/strict'
import { load } from './load-ts.mjs'

const { sortProductLines, normalizeProductLines } = load('lib/order-fields.ts')

test('article codes sort naturally, group case-insensitively and put missing codes last', () => {
  const lines = [
    { productCode: '', product: 'Geen code', size: 'M', quantity: 1 },
    { productCode: 'ART-10', product: 'Shirt', size: 'L', quantity: 2 },
    { productCode: ' art-2 ', product: 'Shirt', size: 'S', quantity: 3, personalisation: { instructions: 'Naam' } },
    { productCode: 'ART-2', product: 'Shirt', size: 'XL', quantity: 4 },
  ]
  const sorted = sortProductLines(lines)
  assert.deepEqual(sorted, [lines[2], lines[3], lines[1], lines[0]])
  assert.equal(sorted[0], lines[2])
  assert.equal(lines[0].productCode, '')
  assert.equal(sorted.reduce((total, line) => total + line.quantity, 0), 10)
  assert.deepEqual(normalizeProductLines(lines).map(line => line.productCode), ['art-2', 'ART-2', 'ART-10', ''])
})
