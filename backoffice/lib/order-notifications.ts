import { sendMail } from '@/lib/mail'
import { translateArticleStatus, translatePrintStatus } from '@/lib/order-status'

type OrderNotificationItem = {
  product: string
  quantity: number
  product_code: string | null
}

type OrderNotificationOrder = {
  order_number: string
  tracking_token?: string | null
  club_name: string
  customer_email: string | null
  article_status: string | null
  print_status: string | null
  notes: string | null
  delivery_date: string | null
  deadline: string | null
  stores?: {
    name?: string | null
  } | null
  order_items?: OrderNotificationItem[] | null
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('nl-NL')
}

function formatItems(items?: OrderNotificationItem[] | null) {
  if (!items?.length) {
    return '- Geen productregels gevonden'
  }

  return items
    .map((item) => {
      const productCode = item.product_code ? `, productcode: ${item.product_code}` : ''
      return `- ${item.product} (${item.quantity}x${productCode})`
    })
    .join('\n')
}

function getTrackingUrl(orderNumber: string, trackingToken?: string | null) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!baseUrl || !trackingToken) {
    return null
  }

  return `${baseUrl.replace(/\/$/, '')}/bestelstatus/${trackingToken}`
}

export async function sendOrderCreatedEmail(order: OrderNotificationOrder) {
  if (!order.customer_email) {
    return { skipped: true, reason: 'Geen klantmail aanwezig.' }
  }

  const storeName = order.stores?.name ?? 'onbekende winkel'
  const subject = `Bevestiging van uw order ${order.order_number}`
  const trackingUrl = getTrackingUrl(order.order_number, order.tracking_token)
  const text = [
    `Beste klant,`,
    '',
    `Bedankt voor uw bestelling. Uw order is goed ontvangen door ${storeName}.`,
    '',
    `Ordernummer: ${order.order_number}`,
    `Naam: ${order.club_name}`,
    `Artikelenstatus: ${translateArticleStatus(order.article_status)}`,
    `Printstatus: ${order.print_status ? translatePrintStatus(order.print_status) : 'Niet van toepassing'}`,
    `Deadline: ${formatDate(order.deadline)}`,
    `Uitleverdatum: ${formatDate(order.delivery_date)}`,
    '',
    'Bestelde producten:',
    formatItems(order.order_items),
    '',
    trackingUrl
      ? `Volg uw bestelling op elk moment via deze persoonlijke bestelpagina:\n${trackingUrl}\n`
      : '',
    order.notes?.trim() ? `Opmerkingen:\n${order.notes.trim()}\n` : '',
    'U ontvangt automatisch een bericht zodra de status van uw bestelling verandert.',
    '',
    'Met vriendelijke groet,',
    storeName,
  ]
    .filter(Boolean)
    .join('\n')

  return sendMail({
    to: order.customer_email,
    subject,
    text,
  })
}

export async function sendOrderStatusChangedEmail(
  order: OrderNotificationOrder,
  changeSummary: string
) {
  if (!order.customer_email) {
    return { skipped: true, reason: 'Geen klantmail aanwezig.' }
  }

  const storeName = order.stores?.name ?? 'onbekende winkel'
  const subject = `Update over uw order ${order.order_number}`
  const trackingUrl = getTrackingUrl(order.order_number, order.tracking_token)
  const text = [
    `Beste klant,`,
    '',
    `Er is een nieuwe update voor uw order ${order.order_number}.`,
    '',
    `${changeSummary}`,
    '',
    `Artikelenstatus nu: ${translateArticleStatus(order.article_status)}`,
    `Printstatus nu: ${order.print_status ? translatePrintStatus(order.print_status) : 'Niet van toepassing'}`,
    '',
    'Bestelde producten:',
    formatItems(order.order_items),
    '',
    trackingUrl
      ? `Bekijk de actuele voortgang via uw persoonlijke bestelpagina:\n${trackingUrl}\n`
      : '',
    'Heeft u vragen? Neem dan contact op met uw winkel en vermeld uw ordernummer.',
    '',
    'Met vriendelijke groet,',
    storeName,
  ].join('\n')

  return sendMail({
    to: order.customer_email,
    subject,
    text,
  })
}
