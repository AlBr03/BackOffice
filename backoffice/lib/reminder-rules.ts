import { type BusinessSettings, type ReminderKey } from './business-settings'
type Candidate = { article_status: string | null; print_status: string | null; article_order_responsibility?: string | null; has_print?: boolean | null; logo_action?: string | null; created_at: string | null; article_ordered_at?: string | null; article_out_of_stock?: boolean | null; expected_article_delivery_date?: string | null; article_delivery_reminder_days_before?: number | null; article_order_reminder_sent_at?: string | null; logo_order_reminder_sent_at?: string | null; article_arrival_reminder_sent_at?: string | null; article_delivery_reminder_sent_at?: string | null }
const DAY = 86400000
export function reminderKinds(order: Candidate, now: Date, settings: BusinessSettings): ReminderKey[] {
  const result: ReminderKey[] = [], article = order.article_status ?? 'new', print = order.print_status ?? 'new'
  const older = (value: string | null | undefined, days: number) => Boolean(value) && Number.isFinite(Date.parse(value!)) && Date.parse(value!) <= now.getTime() - days * DAY
  if (settings.reminders.article_order.enabled && article === 'new' && order.article_order_responsibility !== 'not_needed' && !order.article_order_reminder_sent_at && older(order.created_at, settings.reminders.article_order.days)) result.push('article_order')
  if (settings.reminders.logo_order.enabled && order.has_print && order.logo_action === 'bestellen' && print === 'new' && !order.logo_order_reminder_sent_at && older(order.created_at, settings.reminders.logo_order.days)) result.push('logo_order')
  if (settings.reminders.article_arrival.enabled && article === 'ordered' && !order.article_arrival_reminder_sent_at && older(order.article_ordered_at, settings.reminders.article_arrival.days)) result.push('article_arrival')
  const deliveryDate = Date.parse(order.expected_article_delivery_date ?? '')
  const daysBefore = order.article_delivery_reminder_days_before ?? settings.reminders.article_delivery.days
  if (settings.reminders.article_delivery.enabled && order.article_out_of_stock && !order.article_delivery_reminder_sent_at && article !== 'at_location' && article !== 'completed' && Number.isFinite(deliveryDate) && deliveryDate - daysBefore * DAY <= now.getTime()) result.push('article_delivery')
  return result
}
