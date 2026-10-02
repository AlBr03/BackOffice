import { ARTICLE_STATUS_OPTIONS, PRINT_STATUS_OPTIONS } from './order-status'
import { ARTICLE_ORDER_RESPONSIBILITY_OPTIONS } from './article-order-responsibility'
import { LOGO_ACTION_OPTIONS } from './logo-action'

export type DropdownOption = {
  value: string
  label: string
  enabled: boolean
  customerLabel?: string
  customerDescription?: string
}

export const DROPDOWN_DEFINITIONS = {
  article_status: { title: 'Artikelenstatus', custom: false, required: ['new', 'completed'] },
  print_status: { title: 'Printstatus', custom: false, required: ['new', 'completed'] },
  article_order_responsibility: { title: 'Bestellen door', custom: false, required: ['order_manager'] },
  logo_action: { title: 'Printvoorbeeld / logoactie', custom: true, required: [] },
  role: { title: 'Gebruikersrollen', custom: false, required: ['pending', 'office', 'admin'] },
  print_filter: { title: 'Dashboardfilter: bedrukking', custom: false, required: [''] },
} as const

export type DropdownKey = keyof typeof DROPDOWN_DEFINITIONS
export type DropdownSettings = Record<DropdownKey, DropdownOption[]>
export const DROPDOWN_KEYS = Object.keys(DROPDOWN_DEFINITIONS) as DropdownKey[]

const roles = [
  { value: 'pending', label: 'Nog niet toegewezen' },
  { value: 'store', label: 'Winkel' },
  { value: 'store_manager', label: 'Hoofdverantwoordelijke winkel' },
  { value: 'office', label: 'Hoofdkantoor' },
  { value: 'order_manager', label: 'Bestelverantwoordelijke' },
  { value: 'print', label: 'Printafdeling' },
  { value: 'admin', label: 'Beheerder' },
]

export function defaultDropdownSettings(): DropdownSettings {
  const enable = (options: readonly { value: string; label: string; customerLabel?: string; customerDescription?: string }[]) =>
    options.map((option): DropdownOption => ({
      value: option.value,
      label: option.label,
      enabled: true,
      ...(option.customerLabel ? { customerLabel: option.customerLabel, customerDescription: option.customerDescription } : {}),
    }))
  return {
    article_status: enable(ARTICLE_STATUS_OPTIONS),
    print_status: enable(PRINT_STATUS_OPTIONS),
    article_order_responsibility: enable(ARTICLE_ORDER_RESPONSIBILITY_OPTIONS),
    logo_action: enable(LOGO_ACTION_OPTIONS),
    role: enable(roles),
    print_filter: enable([
      { value: '', label: 'Alles' },
      { value: 'ja', label: 'Alleen print' },
      { value: 'nee', label: 'Zonder print' },
    ]),
  }
}

export function canManageDropdowns(role?: string | null) {
  return role === 'admin' || role === 'office'
}

export function validateDropdownSettings(input: unknown): DropdownSettings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Ongeldige keuzelijsten.')
  }
  const defaults = defaultDropdownSettings()
  const result = {} as DropdownSettings
  const record = input as Record<string, unknown>
  if (Object.keys(record).some((key) => !DROPDOWN_KEYS.includes(key as DropdownKey))) {
    throw new Error('Onbekende keuzelijst.')
  }
  for (const key of DROPDOWN_KEYS) {
    const items = record[key]
    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      throw new Error(`${DROPDOWN_DEFINITIONS[key].title}: kies 1 tot 100 opties.`)
    }
    const seen = new Set<string>()
    result[key] = items.map((item: unknown) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Ongeldige optie.')
      const option = item as Record<string, unknown>
      if (typeof option.value !== 'string' || typeof option.label !== 'string' ||
          typeof option.enabled !== 'boolean' || !option.label.trim() || option.label.trim().length > 100) {
        throw new Error('Elke optie moet een naam (maximaal 100 tekens) en geldige waarde hebben.')
      }
      if (seen.has(option.value)) throw new Error('Een optie komt meerdere keren voor.')
      seen.add(option.value)
      const original = defaults[key].find((entry) => entry.value === option.value)
      if (!original && (!DROPDOWN_DEFINITIONS[key].custom || !/^custom_[a-z0-9_-]{1,70}$/.test(option.value))) {
        throw new Error('Interne workflowwaarden kunnen niet worden toegevoegd of gewijzigd.')
      }
      const normalized: DropdownOption = { value: option.value, label: option.label.trim(), enabled: option.enabled }
      if (key === 'logo_action') {
        for (const field of ['customerLabel', 'customerDescription'] as const) {
          const value = option[field] ?? (original as DropdownOption | undefined)?.[field] ?? ''
          const limit = field === 'customerLabel' ? 100 : 500
          if (typeof value !== 'string' || !value.trim() || value.trim().length > limit) {
            throw new Error(`Vul een klantnaam en klantomschrijving in (maximaal ${limit} tekens).`)
          }
          normalized[field] = value.trim()
        }
      }
      return normalized
    })
    if (defaults[key].some((option) => !seen.has(option.value))) {
      throw new Error('Bestaande opties kunnen worden verborgen, maar niet verwijderd.')
    }
    if (!result[key].some((option) => option.enabled)) throw new Error('Houd minstens één optie zichtbaar.')
    for (const value of DROPDOWN_DEFINITIONS[key].required) {
      if (!result[key].find((option) => option.value === value)?.enabled) {
        throw new Error('Een verplichte workflowoptie kan niet worden verborgen.')
      }
    }
  }
  return result
}

// Merge defaults so a newly introduced system option appears after an app upgrade.
export function mergeDropdownSettings(input: unknown): DropdownSettings {
  const defaults = defaultDropdownSettings()
  if (!input || typeof input !== 'object' || Array.isArray(input)) return defaults
  const record = input as Record<string, unknown>
  const merged = {} as DropdownSettings
  for (const key of DROPDOWN_KEYS) {
    const saved = Array.isArray(record[key]) ? record[key] as DropdownOption[] : []
    merged[key] = [...saved, ...defaults[key].filter((option) => !saved.some((item) => item?.value === option.value))]
  }
  try { return validateDropdownSettings(merged) } catch { return defaults }
}

export function dropdownOptions(settings: DropdownSettings, key: DropdownKey, current?: string) {
  const options = settings[key].filter((option) => option.enabled || option.value === current)
  if (current && !options.some((option) => option.value === current)) {
    return [...options, { value: current, label: current, enabled: false }]
  }
  return options
}

export function dropdownLabel(settings: DropdownSettings, key: DropdownKey, value?: string | null) {
  return settings[key].find((option) => option.value === value)?.label ?? value ?? '-'
}
