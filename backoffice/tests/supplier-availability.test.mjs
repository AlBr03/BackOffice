import { test } from 'node:test'
import assert from 'node:assert/strict'
import { load } from './load-ts.mjs'

const fields = load('lib/order-fields.ts')

test('different supplier dates survive normalisation and description round trips', () => {
  const lines = [
    { product: 'Polo', productCode: 'POLO', size: 'S', quantity: 2, supplierAvailableDate: '2026-11-01' },
    { product: 'Jas', productCode: 'JAS', size: 'L', quantity: 1, supplierAvailableDate: '2026-12-15' },
  ]
  assert.deepEqual(fields.parseProductDescription(fields.serializeProductLines(fields.normalizeProductLines(lines))), lines)
})

test('existing lines without dates remain readable and dates can be cleared', () => {
  const [legacy] = fields.parseProductDescription('Shirt || 2 || SHIRT')
  assert.equal(legacy.product, 'Shirt')
  assert.equal(legacy.supplierAvailableDate, '')
  const [current] = fields.parseProductDescription('SHIRT || Shirt || M || 2')
  assert.equal(current.supplierAvailableDate, '')
  const cleared = fields.normalizeProductLine({ ...current, supplierAvailableDate: '' })
  assert.equal(fields.serializeProductLines([cleared]), 'SHIRT || Shirt || M || 2')
})
