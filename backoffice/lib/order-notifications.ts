import { sendMail } from '@/lib/mail'

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
  status: string | null
  notes: string | null
  delivery_date: string | null
  deadline: string | null
  stores?: {
    name?: string | null
  } | null
  order_items?: OrderNotificationItem[] | null
}

function translateStatus(status?: string | null) {
  switch (status) {
    case 'new':
      return 'Nieuw'
    case 'in_progress':
      return 'In behandeling'
    case 'waiting_print':
      return 'Wacht op print'
    case 'completed':
      return 'Afgerond'
    default:
      return status ?? '-'
  }
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
    `Status: ${translateStatus(order.status)}`,
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
  oldStatus: string,
  newStatus: string
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
    `Vorige status: ${translateStatus(oldStatus)}`,
    `Nieuwe status: ${translateStatus(newStatus)}`,
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
