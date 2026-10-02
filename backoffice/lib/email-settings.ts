import { escapeHtml, renderTemplate, type BusinessSettings, type EmailKey } from './business-settings'

export type TemplateOrder = { order_number: string; club_name: string; store_id?: string | null; article_status: string | null; print_status: string | null; deadline?: string | null; delivery_date?: string | null; stores?: { name?: string | null } | { name?: string | null }[] | null; order_items?: { product: string; quantity: number; product_code: string | null; size?: string | null }[] | null }
export function emailTemplateValues(settings: BusinessSettings, order: TemplateOrder, trackingUrl: string, articleLabel?: string, printLabel?: string) {
  const store = Array.isArray(order.stores) ? order.stores[0] : order.stores
  const details = settings.stores[order.store_id ?? ''] ?? Object.values(settings.stores).find((entry) => entry.name === store?.name)
  const company = settings.company
  return { order_number: order.order_number, customer: order.club_name, store: store?.name ?? company.name, tracking_url: trackingUrl, article_status: articleLabel ?? order.article_status ?? '-', print_status: printLabel ?? order.print_status ?? '-', deadline: order.deadline ?? '-', delivery_date: order.delivery_date ?? '-', company: company.name, contact_email: details?.email || company.email, contact_phone: details?.phone || company.phone, signature: details?.signature || company.signature || `Met vriendelijke groet,\n${store?.name ?? company.name}`, products: (order.order_items ?? []).map((item) => `${item.quantity}x ${item.product}${item.size ? `, maat ${item.size}` : ''}`).join('\n') }
}

export function configuredEmail(settings: BusinessSettings, event: EmailKey, values: ReturnType<typeof emailTemplateValues>, original: { subject: string; text: string; html: string }) {
  const template = settings.emails[event]
  const subject = template.subject ? renderTemplate(template.subject, values).replace(/[\r\n]/g, ' ') : original.subject
  const signature = values.signature
  let text = original.text
  let html = original.html
  if (template.body) {
    const body = renderTemplate(template.body, values)
    const footer = `\n\nOrder: ${values.order_number}\nKlant: ${values.customer}\nArtikelenstatus: ${values.article_status}\nPrintstatus: ${values.print_status}${values.products ? `\nProducten:\n${values.products}` : ''}${values.tracking_url ? `\nBekijk bestelling: ${values.tracking_url}` : ''}\n\n${signature}\n${values.contact_email}\n${values.contact_phone}`
    text = body + footer
    const link = /^https?:\/\//i.test(values.tracking_url) ? `<p><a href="${escapeHtml(values.tracking_url)}">Bekijk bestelling</a></p>` : ''
    html = `<html><body style="font-family:Arial,sans-serif;color:#132033"><h1 style="color:${settings.company.brandColor}">${escapeHtml(settings.company.name)}</h1><div style="white-space:pre-wrap">${escapeHtml(body)}</div><p>Order ${escapeHtml(values.order_number)} · ${escapeHtml(values.customer)}</p><p>Artikelen: ${escapeHtml(values.article_status)} · Print: ${escapeHtml(values.print_status)}</p><p style="white-space:pre-wrap">${escapeHtml(values.products)}</p>${link}<p style="white-space:pre-wrap">${escapeHtml(signature)}\n${escapeHtml(values.contact_email)}\n${escapeHtml(values.contact_phone)}</p></body></html>`
  } else {
    html = html.replace('>INTERSPORT</div>', `>${escapeHtml(settings.company.name)}</div>`).replaceAll('background: #082d78;', `background: ${settings.company.brandColor};`)
    if (settings.company.signature || settings.company.email || settings.company.phone || signature !== `Met vriendelijke groet,\n${values.store}`) {
      const footer = `${signature}\n${values.contact_email}\n${values.contact_phone}`.trim()
      text += `\n\n${footer}`
      html = html.replace('</body>', `<p style="white-space:pre-wrap;font-family:Arial,sans-serif">${escapeHtml(footer)}</p></body>`)
    }
  }
  return { subject, text, html }
}
