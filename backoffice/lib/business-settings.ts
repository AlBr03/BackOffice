export const REMINDER_NAMES = { article_order: 'Artikelen nog niet besteld', logo_order: "Logo’s nog niet besteld", article_arrival: 'Artikelen nog niet binnen', article_delivery: 'Verwachte artikellevering' } as const
export const EMAIL_NAMES = { created: 'Orderbevestiging', status_changed: 'Statuswijziging (klant)', internal_arrival: 'Aankomst op locatie (intern)', ready: 'Klaar om op te halen', completed: 'Order afgerond', proof_ready: 'Printvoorbeeld klaar', proof_approved: 'Printvoorbeeld goedgekeurd', proof_rejected: 'Printvoorbeeld afgewezen', print_created: 'Nieuwe printopdracht', purchase_created: 'Nieuwe artikelbestelling', store_created: 'Bestellen door winkel', article_order: 'Reminder bestellen', logo_order: 'Reminder logo’s', article_arrival: 'Reminder aankomst', article_delivery: 'Reminder levering' } as const
export const EVENT_NAMES = { created: 'Order aangemaakt', order_updated: 'Order bijgewerkt', status_changed: 'Status gewijzigd', reminder_sent: 'Reminder verstuurd', customer_logo_uploaded: 'Logo aangeleverd', print_proof_ready: 'Printvoorbeeld klaar', print_proof_approved: 'Printvoorbeeld goedgekeurd', print_proof_rejected: 'Printvoorbeeld afgewezen' } as const
export const ROLES = ['store', 'store_manager', 'office', 'order_manager', 'print', 'admin'] as const
export const RECIPIENTS = ['responsible', 'order_manager', 'store_manager', 'print', 'office', 'admin'] as const
export const FIELD_NAMES = { customer_email: 'E-mailadres klant', accepted_by: 'Aangenomen door', supplier: 'Artikelleverancier', print_supplier: 'Printleverancier', logo_action: 'Printvoorbeeld / logoactie', print_instructions: 'Printinstructies', deadline: 'Deadline', delivery_date: 'Uitleverdatum', expected_article_delivery_date: 'Verwachte artikellevering' } as const
export const TRANSITIONS = ['article:new', 'article:ordered', 'article:at_location', 'article:completed', 'print:new', 'print:logos_ordered', 'print:logos_at_location', 'print:completed'] as const
export const COLUMN_NAMES = { order: 'Order', store: 'Winkel', customer: 'Klant', product: 'Product', quantity: 'Aantal', print: 'Print', status: 'Status' } as const
export const SORT_NAMES = { newest: 'Nieuwste eerst', oldest: 'Oudste eerst', customer: 'Klantnaam', number: 'Ordernummer' } as const
export type ReminderKey = keyof typeof REMINDER_NAMES
export type EmailKey = keyof typeof EMAIL_NAMES
export type EventKey = keyof typeof EVENT_NAMES
export type FieldKey = keyof typeof FIELD_NAMES
export type ColumnKey = keyof typeof COLUMN_NAMES
export type Role = typeof ROLES[number]
export type Recipient = typeof RECIPIENTS[number]
export type OrderDefaults = { supplier: string; printSupplier: string; responsibility: 'order_manager' | 'store_manager' | 'not_needed'; reminderDays: number }
export type ContactDetails = { name: string; email: string; phone: string; address: string; openingHours: string; signature: string }
export type BusinessSettings = {
  company: ContactDetails & { brandColor: string }
  stores: Record<string, ContactDetails & { defaults: OrderDefaults | null }>
  suppliers: { id: string; name: string; kind: 'article' | 'print' | 'both'; email: string; phone: string; active: boolean }[]
  defaults: OrderDefaults
  reminders: Record<ReminderKey, { enabled: boolean; days: number; recipients: Recipient[] }>
  emails: Record<EmailKey, { enabled: boolean; subject: string; body: string }>
  required: { create: FieldKey[]; transitions: Record<typeof TRANSITIONS[number], FieldKey[]> }
  notifications: Record<EventKey, { enabled: boolean; roles: Role[] }>
}
export type PersonalSettings = { mode: 'light' | 'dark'; dashboard: { articleStatus: string; printStatus: string; print: '' | 'ja' | 'nee'; sort: keyof typeof SORT_NAMES; columns: ColumnKey[] }; notifications: EventKey[] }

export const TEMPLATE_VARIABLES = ['order_number', 'customer', 'store', 'tracking_url', 'article_status', 'print_status', 'deadline', 'delivery_date', 'company', 'contact_email', 'contact_phone', 'signature', 'products'] as const

export function defaultBusinessSettings(): BusinessSettings {
  const contact: ContactDetails = { name: 'INTERSPORT', email: '', phone: '', address: '', openingHours: '', signature: '' }
  return {
    company: { ...contact, brandColor: '#082d78' }, stores: {}, suppliers: [],
    defaults: { supplier: '', printSupplier: '', responsibility: 'order_manager', reminderDays: 2 },
    reminders: { article_order: { enabled: true, days: 3, recipients: ['responsible'] }, logo_order: { enabled: true, days: 5, recipients: ['print'] }, article_arrival: { enabled: true, days: 21, recipients: ['responsible'] }, article_delivery: { enabled: true, days: 2, recipients: ['responsible'] } },
    emails: Object.fromEntries(Object.keys(EMAIL_NAMES).map((key) => [key, { enabled: true, subject: '', body: '' }])) as BusinessSettings['emails'],
    required: { create: [], transitions: Object.fromEntries(TRANSITIONS.map((key) => [key, [] as FieldKey[]])) as BusinessSettings['required']['transitions'] },
    notifications: Object.fromEntries(Object.keys(EVENT_NAMES).map((key) => [key, { enabled: true, roles: [...ROLES] }])) as BusinessSettings['notifications'],
  }
}

export function defaultPersonalSettings(): PersonalSettings {
  return { mode: 'light', dashboard: { articleStatus: '', printStatus: '', print: '', sort: 'newest', columns: Object.keys(COLUMN_NAMES) as ColumnKey[] }, notifications: Object.keys(EVENT_NAMES) as EventKey[] }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Ongeldige instellingen.')
  return value as Record<string, unknown>
}
function text(value: unknown, maximum = 200, required = false): string {
  if (typeof value !== 'string' || value.length > maximum || (required && !value.trim())) throw new Error(`Vul geldige tekst in (maximaal ${maximum} tekens).`)
  return value.trim()
}
function boolean(value: unknown) { if (typeof value !== 'boolean') throw new Error('Ongeldige aan/uit-keuze.'); return value }
function days(value: unknown) { if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 365) throw new Error('Het aantal dagen moet tussen 0 en 365 liggen.'); return value as number }
function choices<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(value) || value.some((item) => !allowed.includes(item)) || new Set(value).size !== value.length) throw new Error('Ongeldige of dubbele keuzes.')
  return value as T[]
}
function email(value: unknown) { const result = text(value, 254); if (result && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new Error('Ongeldig e-mailadres.'); return result }
function contact(value: unknown): ContactDetails {
  const row = record(value)
  return { name: text(row.name, 100, true), email: email(row.email), phone: text(row.phone, 50), address: text(row.address, 500), openingHours: text(row.openingHours, 1000), signature: text(row.signature, 2000) }
}
function defaults(value: unknown): OrderDefaults {
  const row = record(value)
  if (!['order_manager', 'store_manager', 'not_needed'].includes(String(row.responsibility))) throw new Error('Ongeldige bestelverantwoordelijkheid.')
  return { supplier: text(row.supplier, 100), printSupplier: text(row.printSupplier, 100), responsibility: row.responsibility as OrderDefaults['responsibility'], reminderDays: days(row.reminderDays) }
}
export function renderTemplate(template: string, values: Partial<Record<typeof TEMPLATE_VARIABLES[number], string>>): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, key) => values[key as keyof typeof values] ?? '')
}
function template(value: unknown, limit: number) {
  const result = text(value, limit)
  if (/\r|\n/.test(result) && limit === 200) throw new Error('Een mailonderwerp mag geen regeleinden bevatten.')
  const remainder = result.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, key) => {
    if (!(TEMPLATE_VARIABLES as readonly string[]).includes(key)) throw new Error(`Onbekende placeholder: ${key}`)
    return ''
  })
  if (remainder.includes('{{') || remainder.includes('}}')) throw new Error('Ongeldige placeholder.')
  return result
}

export function validateBusinessSettings(input: unknown): BusinessSettings {
  const row = record(input), base = defaultBusinessSettings()
  if (Object.keys(row).some((key) => !Object.hasOwn(base, key))) throw new Error('Onbekende instelling.')
  const company = record(row.company)
  const brandColor = text(company.brandColor, 7)
  if (!/^#[0-9a-f]{6}$/i.test(brandColor)) throw new Error('Kies een geldige merkkleur.')
  const result: BusinessSettings = { ...base, company: { ...contact(company), brandColor }, defaults: defaults(row.defaults) }
  if (!Array.isArray(row.suppliers) || row.suppliers.length > 200) throw new Error('Maximaal 200 leveranciers toegestaan.')
  const ids = new Set<string>(), names = new Set<string>()
  result.suppliers = row.suppliers.map((value) => {
    const item = record(value), id = text(item.id, 100, true), name = text(item.name, 100, true)
    if (!/^supplier_[a-z0-9_-]+$/i.test(id) || ids.has(id) || names.has(name.toLowerCase()) || !['article', 'print', 'both'].includes(String(item.kind))) throw new Error('Ongeldige of dubbele leverancier.')
    ids.add(id); names.add(name.toLowerCase())
    return { id, name, kind: item.kind as 'article' | 'print' | 'both', email: email(item.email), phone: text(item.phone, 50), active: boolean(item.active) }
  })
  const storeRows = record(row.stores)
  if (Object.keys(storeRows).length > 1000) throw new Error('Te veel winkelinstellingen.')
  result.stores = Object.fromEntries(Object.entries(storeRows).map(([id, value]) => {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Ongeldige winkel.')
    const item = record(value)
    return [id, { ...contact(item), defaults: item.defaults === null ? null : defaults(item.defaults) }]
  }))
  for (const current of [result.defaults, ...Object.values(result.stores).flatMap((store) => store.defaults ? [store.defaults] : [])]) {
    for (const [field, kind] of [['supplier', 'article'], ['printSupplier', 'print']] as const) {
      if (current[field] && !result.suppliers.some((supplier) => supplier.id === current[field] && supplier.active && (supplier.kind === kind || supplier.kind === 'both'))) throw new Error('Een standaardleverancier moet actief zijn en bij het juiste type horen.')
    }
  }
  const reminders = record(row.reminders), emails = record(row.emails), required = record(row.required), transitions = record(required.transitions), notifications = record(row.notifications)
  for (const key of Object.keys(REMINDER_NAMES) as ReminderKey[]) {
    const item = record(reminders[key]), recipients = choices(item.recipients, RECIPIENTS)
    result.reminders[key] = { enabled: boolean(item.enabled), days: days(item.days), recipients }
    if (result.reminders[key].enabled && !recipients.length) throw new Error('Een actieve reminder moet ontvangers hebben.')
  }
  for (const key of Object.keys(EMAIL_NAMES) as EmailKey[]) {
    const item = record(emails[key])
    result.emails[key] = { enabled: boolean(item.enabled), subject: template(item.subject, 200), body: template(item.body, 10000) }
  }
  result.required.create = choices(required.create, Object.keys(FIELD_NAMES) as FieldKey[])
  for (const key of TRANSITIONS) result.required.transitions[key] = choices(transitions[key], Object.keys(FIELD_NAMES) as FieldKey[])
  for (const key of Object.keys(EVENT_NAMES) as EventKey[]) {
    const item = record(notifications[key]), roles = choices(item.roles, ROLES)
    result.notifications[key] = { enabled: boolean(item.enabled), roles }
    if (result.notifications[key].enabled && !roles.length) throw new Error('Een actief notificatie-event moet minstens één rol hebben.')
  }
  return result
}

export function validatePersonalSettings(input: unknown): PersonalSettings {
  const row = record(input), dashboard = record(row.dashboard)
  if (!['light', 'dark'].includes(String(row.mode)) || !['', 'new', 'ordered', 'at_location', 'completed'].includes(String(dashboard.articleStatus)) || !['', 'new', 'logos_ordered', 'logos_at_location', 'completed'].includes(String(dashboard.printStatus)) || !['', 'ja', 'nee'].includes(String(dashboard.print)) || !Object.hasOwn(SORT_NAMES, String(dashboard.sort))) throw new Error('Ongeldige persoonlijke voorkeuren.')
  const columns = choices(dashboard.columns, Object.keys(COLUMN_NAMES) as ColumnKey[])
  if (!columns.includes('order')) throw new Error('De orderkolom moet zichtbaar blijven.')
  return { mode: row.mode as PersonalSettings['mode'], dashboard: { articleStatus: dashboard.articleStatus as string, printStatus: dashboard.printStatus as string, print: dashboard.print as PersonalSettings['dashboard']['print'], sort: dashboard.sort as PersonalSettings['dashboard']['sort'], columns }, notifications: choices(row.notifications, Object.keys(EVENT_NAMES) as EventKey[]) }
}

export function mergeBusinessSettings(input: unknown): BusinessSettings {
  const base = defaultBusinessSettings()
  if (!input || typeof input !== 'object' || Array.isArray(input)) return base
  const saved = input as Partial<BusinessSettings>
  try { return validateBusinessSettings({ ...base, ...saved, company: { ...base.company, ...saved.company }, defaults: { ...base.defaults, ...saved.defaults }, reminders: { ...base.reminders, ...saved.reminders }, emails: { ...base.emails, ...saved.emails }, notifications: { ...base.notifications, ...saved.notifications }, required: { ...base.required, ...saved.required, transitions: { ...base.required.transitions, ...saved.required?.transitions } } }) } catch { return base }
}
export function orderDefaults(settings: BusinessSettings, storeId?: string | null) {
  return settings.stores[storeId ?? '']?.defaults ?? settings.defaults
}
export function defaultSupplierName(settings: BusinessSettings, id: string) {
  return settings.suppliers.find((supplier) => supplier.id === id && supplier.active)?.name ?? ''
}
export function missingRequiredFields(settings: BusinessSettings, order: Record<string, unknown>, transition?: typeof TRANSITIONS[number]) {
  const fields = transition ? settings.required.transitions[transition] : settings.required.create
  return fields.filter((field) => !(['print_supplier', 'logo_action', 'print_instructions'].includes(field) && !order.has_print) && !(field === 'expected_article_delivery_date' && !order.article_out_of_stock) && !String(order[field] ?? '').trim())
}
export function visibleNotificationEvents(settings: BusinessSettings, personal: PersonalSettings, role: string) {
  return (Object.keys(EVENT_NAMES) as EventKey[]).filter((key) => settings.notifications[key].enabled && (settings.notifications[key].roles as readonly string[]).includes(role) && personal.notifications.includes(key))
}
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}
