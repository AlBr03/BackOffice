import { test } from 'node:test'
import assert from 'node:assert/strict'
import { load } from './load-ts.mjs'

const rules = load('lib/article-order-responsibility.ts')
const dropdowns = load('lib/dropdown-settings.ts')

test('saved dropdowns gain the seller option and updated stock label', () => {
  const saved = dropdowns.defaultDropdownSettings()
  saved.article_order_responsibility = saved.article_order_responsibility
    .filter(option => option.value !== 'ordered_by_seller')
    .map(option => option.value === 'not_needed' ? { ...option, label: 'Niet bestellen' } : option)
  const merged = dropdowns.mergeDropdownSettings(saved)
  assert.equal(dropdowns.dropdownLabel(merged, 'article_order_responsibility', 'not_needed'), 'Niet bestellen/Op voorraad')
  assert.equal(dropdowns.dropdownLabel(merged, 'article_order_responsibility', 'ordered_by_seller'), 'Besteld door verkoper')
  assert.equal(rules.isArticleOrderResponsibility('ordered_by_seller'), true)
  assert.equal(rules.getArticleOrderResponsibility('ordered_by_seller').value, 'ordered_by_seller')
  assert.doesNotThrow(() => dropdowns.validateDropdownSettings(merged))
})

test('custom stock labels are preserved during upgrade', () => {
  const saved = dropdowns.defaultDropdownSettings()
  saved.article_order_responsibility.find(option => option.value === 'not_needed').label = 'Eigen voorraad'
  assert.equal(dropdowns.dropdownLabel(dropdowns.mergeDropdownSettings(saved), 'article_order_responsibility', 'not_needed'), 'Eigen voorraad')
})
