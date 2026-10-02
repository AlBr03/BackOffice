import 'server-only'
import { loadBusinessSettingsForSystem } from '@/lib/business-settings-server'
import { loadDropdownSettings } from '@/lib/dropdown-settings-server'
import { configuredEmail, emailTemplateValues, type TemplateOrder } from '@/lib/email-settings'
import { translateArticleStatus, translatePrintStatus } from '@/lib/order-status'
import { getPublicOrderTrackingUrl } from '@/lib/public-url'
import { sendMail } from '@/lib/mail'
import type { EmailKey } from '@/lib/business-settings'
import { mailPreviewContext } from '@/lib/mail-preview-context'

export async function sendBusinessMail(event: EmailKey, order: TemplateOrder, original: Parameters<typeof sendMail>[0]) {
  const preview = mailPreviewContext.getStore()
  const [{ settings }, { settings: dropdowns }] = await Promise.all([preview ? Promise.resolve({ settings: preview.settings }) : loadBusinessSettingsForSystem(), loadDropdownSettings()])
  if (!settings.emails[event].enabled && !preview) return { skipped: true, reason: 'Deze mail is uitgeschakeld in de bedrijfsinstellingen.' }
  const values = emailTemplateValues(settings, order, getPublicOrderTrackingUrl((order as TemplateOrder & { tracking_token?: string | null }).tracking_token) ?? '', translateArticleStatus(order.article_status, dropdowns), translatePrintStatus(order.print_status, dropdowns))
  const configured = configuredEmail(settings, event, values, { ...original, html: original.html ?? '' })
  if (preview) { preview.capture(configured); return { skipped: true, reason: 'Alleen voorbeeld; er is geen mail verstuurd.' } }
  const replyTo = values.contact_email || original.replyTo
  return sendMail({ ...original, ...configured, replyTo })
}
