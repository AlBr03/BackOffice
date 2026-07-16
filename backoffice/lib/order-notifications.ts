import { sendMail } from '@/lib/mail'
import { translateArticleStatus, translatePrintStatus } from '@/lib/order-status'
import { getPublicOrderTrackingUrl } from '@/lib/public-url'

type OrderNotificationItem = {
  product: string
  quantity: number
  product_code: string | null
  size?: string | null
}

type StoreRelation =
  | {
      name?: string | null
    }
  | {
      name?: string | null
    }[]
  | null

type OrderNotificationOrder = {
  order_number: string
  tracking_token?: string | null
  club_name: string
  customer_email: string | null
  article_status: string | null
  article_order_responsibility?: string | null
  print_status: string | null
  has_print?: boolean | null
  notes: string | null
  print_supplier?: string | null
  print_instructions?: string | null
  delivery_date: string | null
  deadline: string | null
  store_manager_email?: string | null
  order_detail_url?: string | null
  stores?: StoreRelation
  order_items?: OrderNotificationItem[] | null
}

function getStoreName(stores?: StoreRelation) {
  const store = Array.isArray(stores) ? stores[0] : stores

  return store?.name ?? 'onbekende winkel'
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
      const productCode = item.product_code || '-'
      const size = item.size || '-'
      return `- ${productCode} - ${item.product} - maat ${size} - ${item.quantity}x`
    })
    .join('\n')
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function htmlRows(rows: { label: string; value: string }[]) {
  return rows
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding: 10px 0; color: #5b6472; font-size: 14px; border-bottom: 1px solid #e6ebf2;">${escapeHtml(label)}</td>
          <td style="padding: 10px 0; color: #13233a; font-size: 14px; font-weight: 700; text-align: right; border-bottom: 1px solid #e6ebf2;">${escapeHtml(value)}</td>
        </tr>
      `
    )
    .join('')
}

function htmlItems(items?: OrderNotificationItem[] | null) {
  if (!items?.length) {
    return '<tr><td colspan="4" style="padding: 12px 0; color: #5b6472; font-size: 14px;">Geen productregels gevonden</td></tr>'
  }

  return items
    .map(
      (item) => `
        <tr>
          <td style="padding: 12px 0; color: #5b6472; font-size: 14px; border-bottom: 1px solid #e6ebf2;">${escapeHtml(item.product_code || '-')}</td>
          <td style="padding: 12px 0; color: #13233a; font-size: 14px; border-bottom: 1px solid #e6ebf2;">${escapeHtml(item.product)}</td>
          <td style="padding: 12px 0; color: #13233a; font-size: 14px; text-align: center; border-bottom: 1px solid #e6ebf2;">${escapeHtml(item.size || '-')}</td>
          <td style="padding: 12px 0; color: #13233a; font-size: 14px; text-align: right; border-bottom: 1px solid #e6ebf2;">${escapeHtml(item.quantity)}x</td>
        </tr>
      `
    )
    .join('')
}

function htmlParagraphs(paragraphs: string[]) {
  return paragraphs
    .map(
      (paragraph) =>
        `<p style="margin: 0 0 14px; color: #2d3748; font-size: 15px; line-height: 1.6;">${escapeHtml(paragraph)}</p>`
    )
    .join('')
}

function emailLayout({
  title,
  preheader,
  intro,
  statusLabel,
  statusValue,
  order,
  storeName,
  trackingUrl,
  ctaLabel = 'Bekijk bestelstatus',
  footerNote,
}: {
  title: string
  preheader: string
  intro: string[]
  statusLabel: string
  statusValue: string
  order: OrderNotificationOrder
  storeName: string
  trackingUrl: string | null
  ctaLabel?: string
  footerNote: string
}) {
  const orderRows = htmlRows([
    { label: 'Ordernummer', value: order.order_number },
    { label: 'Naam', value: order.club_name },
    { label: 'Winkel', value: storeName },
    { label: 'Artikelenstatus', value: translateArticleStatus(order.article_status) },
    {
      label: 'Printstatus',
      value: order.print_status ? translatePrintStatus(order.print_status) : 'Niet van toepassing',
    },
    { label: 'Deadline', value: formatDate(order.deadline) },
    { label: 'Uitleverdatum', value: formatDate(order.delivery_date) },
  ])

  return `<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin: 0; padding: 0; background: #f3f6fb; font-family: Arial, Helvetica, sans-serif;">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f3f6fb; padding: 28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #dce4ef;">
            <tr>
              <td style="background: #082d78; padding: 24px 28px;">
                <div style="color: #ffffff; font-size: 12px; letter-spacing: 2px; font-weight: 800; text-transform: uppercase;">INTERSPORT</div>
                <div style="color: #ffffff; font-size: 24px; line-height: 1.25; font-weight: 800; margin-top: 8px;">${escapeHtml(title)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding: 28px;">
                ${htmlParagraphs(intro)}

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0; background: #f7f9fc; border: 1px solid #e1e7f0; border-radius: 10px;">
                  <tr>
                    <td style="padding: 16px 18px;">
                      <div style="color: #5b6472; font-size: 13px; font-weight: 700; text-transform: uppercase;">${escapeHtml(statusLabel)}</div>
                      <div style="color: #082d78; font-size: 22px; line-height: 1.35; font-weight: 800; margin-top: 4px;">${escapeHtml(statusValue)}</div>
                    </td>
                  </tr>
                </table>

                <h2 style="margin: 0 0 10px; color: #13233a; font-size: 18px; line-height: 1.35;">Ordergegevens</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                  ${orderRows}
                </table>

                <h2 style="margin: 26px 0 10px; color: #13233a; font-size: 18px; line-height: 1.35;">Bestelde producten</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                  <tr>
                    <th align="left" style="padding: 0 0 8px; color: #5b6472; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #dce4ef;">Artikelcode</th>
                    <th align="left" style="padding: 0 0 8px; color: #5b6472; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #dce4ef;">Omschrijving</th>
                    <th align="center" style="padding: 0 0 8px; color: #5b6472; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #dce4ef;">Maat</th>
                    <th align="right" style="padding: 0 0 8px; color: #5b6472; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #dce4ef;">Aantal</th>
                  </tr>
                  ${htmlItems(order.order_items)}
                </table>

                ${
                  trackingUrl
                    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px 0 18px;">
                        <tr>
                          <td style="background: #0f4ea8; border-radius: 8px;">
                            <a href="${escapeHtml(trackingUrl)}" style="display: inline-block; padding: 13px 20px; color: #ffffff; font-size: 15px; font-weight: 800; text-decoration: none;">${escapeHtml(ctaLabel)}</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 0 0 18px; color: #5b6472; font-size: 13px; line-height: 1.6;">Werkt de knop niet? Kopieer deze link in uw browser:<br><a href="${escapeHtml(trackingUrl)}" style="color: #0f4ea8; word-break: break-all;">${escapeHtml(trackingUrl)}</a></p>`
                    : ''
                }

                <p style="margin: 22px 0 0; color: #2d3748; font-size: 15px; line-height: 1.6;">${escapeHtml(footerNote)}</p>
                <p style="margin: 22px 0 0; color: #2d3748; font-size: 15px; line-height: 1.6;">Met vriendelijke groet,<br><strong>${escapeHtml(storeName)}</strong></p>
              </td>
            </tr>
            <tr>
              <td style="background: #f7f9fc; padding: 18px 28px; color: #697386; font-size: 12px; line-height: 1.6; border-top: 1px solid #e1e7f0;">
                Deze e-mail is automatisch verzonden door INTERSPORT Veghel. Reageert u op dit bericht, dan komt uw reactie terecht bij de verantwoordelijke winkel.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export async function sendOrderCreatedEmail(order: OrderNotificationOrder) {
  if (!order.customer_email) {
    return { skipped: true, reason: 'Geen klantmail aanwezig.' }
  }

  const storeName = getStoreName(order.stores)
  const subject = `Bevestiging van uw order ${order.order_number}`
  const trackingUrl = getPublicOrderTrackingUrl(order.tracking_token)
  const html = emailLayout({
    title: 'Uw bestelling is ontvangen',
    preheader: `Uw order ${order.order_number} is ontvangen door ${storeName}.`,
    intro: [
      'Beste klant,',
      `Bedankt voor uw bestelling. Uw order is goed ontvangen door ${storeName}. Hieronder vindt u de belangrijkste gegevens en de link naar uw persoonlijke bestelstatus.`,
    ],
    statusLabel: 'Huidige status',
    statusValue: translateArticleStatus(order.article_status),
    order,
    storeName,
    trackingUrl,
    footerNote: 'U ontvangt automatisch een bericht zodra de status van uw bestelling verandert.',
  })
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
    'U ontvangt automatisch een bericht zodra de status van uw bestelling verandert.',
    '',
    'Met vriendelijke groet,',
    storeName,
  ]
    .filter(Boolean)
    .join('\n')

  return sendMail({
    to: order.customer_email,
    replyTo: order.store_manager_email,
    subject,
    text,
    html,
  })
}

export async function sendOrderStatusChangedEmail(
  order: OrderNotificationOrder,
  changeSummary: string
) {
  if (!order.customer_email) {
    return { skipped: true, reason: 'Geen klantmail aanwezig.' }
  }

  const storeName = getStoreName(order.stores)
  const subject = `Update over uw order ${order.order_number}`
  const trackingUrl = getPublicOrderTrackingUrl(order.tracking_token)
  const html = emailLayout({
    title: 'Update over uw bestelling',
    preheader: `Er is een nieuwe update voor order ${order.order_number}.`,
    intro: ['Beste klant,', `Er is een nieuwe update voor uw order ${order.order_number}.`, changeSummary],
    statusLabel: 'Nieuwe status',
    statusValue: translateArticleStatus(order.article_status),
    order,
    storeName,
    trackingUrl,
    footerNote: 'Heeft u vragen? Reageer gerust op deze e-mail en vermeld uw ordernummer.',
  })
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
    replyTo: order.store_manager_email,
    subject,
    text,
    html,
  })
}

export function shouldSendOrderReadyForPickupEmail(order: OrderNotificationOrder) {
  return (
    order.article_status === 'at_location' &&
    (!order.has_print || order.print_status === 'completed')
  )
}

export function shouldSendOrderCompletedEmail(order: OrderNotificationOrder) {
  return order.article_status === 'completed'
}

export async function sendOrderReadyForPickupEmail(order: OrderNotificationOrder) {
  if (!order.customer_email) {
    return { skipped: true, reason: 'Geen klantmail aanwezig.' }
  }

  const storeName = getStoreName(order.stores)
  const subject = `Uw order ${order.order_number} kan worden opgehaald`
  const trackingUrl = getPublicOrderTrackingUrl(order.tracking_token)
  const html = emailLayout({
    title: 'Uw bestelling staat klaar',
    preheader: `Uw order ${order.order_number} kan worden opgehaald bij ${storeName}.`,
    intro: [
      'Beste klant,',
      `Goed nieuws: uw bestelling staat klaar bij ${storeName}. U kunt de artikelen ophalen op locatie.`,
      'Neem bij het ophalen uw ordernummer mee, zodat de winkel uw bestelling snel kan terugvinden.',
    ],
    statusLabel: 'Klaar voor ophalen',
    statusValue: 'Artikelen op locatie',
    order,
    storeName,
    trackingUrl,
    footerNote: 'Heeft u vragen over het ophalen? Reageer gerust op deze e-mail of neem contact op met uw winkel.',
  })
  const text = [
    'Beste klant,',
    '',
    `Goed nieuws: uw bestelling staat klaar bij ${storeName}.`,
    'U kunt de artikelen ophalen op locatie.',
    '',
    `Ordernummer: ${order.order_number}`,
    `Naam: ${order.club_name}`,
    `Artikelenstatus: ${translateArticleStatus(order.article_status)}`,
    `Printstatus: ${order.print_status ? translatePrintStatus(order.print_status) : 'Niet van toepassing'}`,
    '',
    'Bestelde producten:',
    formatItems(order.order_items),
    '',
    trackingUrl ? `Bekijk uw bestelstatus:\n${trackingUrl}\n` : '',
    'Met vriendelijke groet,',
    storeName,
  ]
    .filter(Boolean)
    .join('\n')

  return sendMail({
    to: order.customer_email,
    replyTo: order.store_manager_email,
    subject,
    text,
    html,
  })
}

export async function sendOrderCompletedEmail(order: OrderNotificationOrder) {
  if (!order.customer_email) {
    return { skipped: true, reason: 'Geen klantmail aanwezig.' }
  }

  const storeName = getStoreName(order.stores)
  const subject = `Bedankt voor uw order ${order.order_number}`
  const trackingUrl = getPublicOrderTrackingUrl(order.tracking_token)
  const html = emailLayout({
    title: 'Bedankt voor uw bestelling',
    preheader: `Uw order ${order.order_number} is afgerond. Bedankt voor uw bestelling.`,
    intro: [
      'Beste klant,',
      `Uw order ${order.order_number} is afgerond. Bedankt voor uw bestelling bij ${storeName}.`,
      'Wij wensen u veel plezier met de artikelen.',
    ],
    statusLabel: 'Order afgerond',
    statusValue: 'Bedankt voor uw bestelling',
    order,
    storeName,
    trackingUrl,
    footerNote: 'Heeft u nog vragen over deze bestelling? Reageer gerust op deze e-mail of neem contact op met uw winkel.',
  })
  const text = [
    'Beste klant,',
    '',
    `Uw order ${order.order_number} is afgerond. Bedankt voor uw bestelling bij ${storeName}.`,
    'Wij wensen u veel plezier met de artikelen.',
    '',
    `Ordernummer: ${order.order_number}`,
    `Naam: ${order.club_name}`,
    '',
    'Bestelde producten:',
    formatItems(order.order_items),
    '',
    trackingUrl ? `Bekijk uw bestelstatus:\n${trackingUrl}\n` : '',
    'Met vriendelijke groet,',
    storeName,
  ]
    .filter(Boolean)
    .join('\n')

  return sendMail({
    to: order.customer_email,
    replyTo: order.store_manager_email,
    subject,
    text,
    html,
  })
}

export async function sendPrintProofReadyEmail(order: OrderNotificationOrder) {
  if (!order.customer_email) {
    return { skipped: true, reason: 'Geen klantmail aanwezig.' }
  }

  const storeName = getStoreName(order.stores)
  const subject = `Printvoorbeeld klaar voor order ${order.order_number}`
  const trackingUrl = getPublicOrderTrackingUrl(order.tracking_token)
  const html = emailLayout({
    title: 'Printvoorbeeld klaar voor beoordeling',
    preheader: `Het printvoorbeeld voor order ${order.order_number} staat klaar.`,
    intro: [
      'Beste klant,',
      `Het printvoorbeeld voor uw order ${order.order_number} staat klaar op uw persoonlijke bestelstatuspagina.`,
      'Controleer het voorbeeld zorgvuldig. U kunt het direct goedkeuren of aangeven wat er aangepast moet worden.',
    ],
    statusLabel: 'Actie gevraagd',
    statusValue: 'Printvoorbeeld beoordelen',
    order,
    storeName,
    trackingUrl,
    ctaLabel: 'Printvoorbeeld beoordelen',
    footerNote: 'Zodra u reageert, wordt de winkel automatisch op de hoogte gebracht.',
  })
  const text = [
    'Beste klant,',
    '',
    `Het printvoorbeeld voor uw order ${order.order_number} staat klaar.`,
    'Controleer het voorbeeld zorgvuldig. U kunt het goedkeuren of aangeven wat er aangepast moet worden.',
    '',
    `Ordernummer: ${order.order_number}`,
    `Naam: ${order.club_name}`,
    '',
    trackingUrl ? `Beoordeel het printvoorbeeld via uw persoonlijke bestelpagina:\n${trackingUrl}\n` : '',
    'Zodra u reageert, wordt de winkel automatisch op de hoogte gebracht.',
    '',
    'Met vriendelijke groet,',
    storeName,
  ]
    .filter(Boolean)
    .join('\n')

  return sendMail({
    to: order.customer_email,
    replyTo: order.store_manager_email,
    subject,
    text,
    html,
  })
}

export async function sendPrintOrderCreatedEmail(
  to: string,
  order: OrderNotificationOrder
) {
  if (!to) {
    return { skipped: true, reason: 'Geen printafdeling-mailadres aanwezig.' }
  }

  const storeName = getStoreName(order.stores)
  const trackingUrl = getPublicOrderTrackingUrl(order.tracking_token)
  const subject = `Nieuwe printopdracht voor order ${order.order_number}`
  const html = emailLayout({
    title: 'Nieuwe printopdracht',
    preheader: `Order ${order.order_number} bevat printwerk voor ${order.club_name}.`,
    intro: [
      'Beste printafdeling,',
      `Er is een nieuwe order aangemaakt met een printopdracht voor ${order.club_name}. Hieronder staan de belangrijkste gegevens.`,
      order.print_supplier?.trim()
        ? `Leverancier printwerk: ${order.print_supplier.trim()}`
        : 'Er is geen printleverancier ingevuld.',
      order.print_instructions?.trim()
        ? `Printinstructies: ${order.print_instructions.trim()}`
        : 'Er zijn geen aanvullende printinstructies ingevuld.',
    ],
    statusLabel: 'Printstatus',
    statusValue: order.print_status ? translatePrintStatus(order.print_status) : 'Nieuw',
    order,
    storeName,
    trackingUrl: order.order_detail_url ?? trackingUrl,
    ctaLabel: order.order_detail_url ? 'Open order in backoffice' : 'Bekijk bestelstatus',
    footerNote: 'Open de order in de backoffice om de printopdracht verder te verwerken.',
  })
  const text = [
    'Beste printafdeling,',
    '',
    `Er is een nieuwe order aangemaakt met een printopdracht voor ${order.club_name}.`,
    '',
    `Ordernummer: ${order.order_number}`,
    `Winkel: ${storeName}`,
    `Naam: ${order.club_name}`,
    `Printstatus: ${order.print_status ? translatePrintStatus(order.print_status) : 'Nieuw'}`,
    `Leverancier printwerk: ${order.print_supplier?.trim() || '-'}`,
    `Deadline: ${formatDate(order.deadline)}`,
    `Uitleverdatum: ${formatDate(order.delivery_date)}`,
    '',
    'Bestelde producten:',
    formatItems(order.order_items),
    '',
    'Printinstructies:',
    order.print_instructions?.trim() || '-',
    '',
    order.order_detail_url ? `Open de order in de backoffice:\n${order.order_detail_url}\n` : '',
    trackingUrl ? `Publieke bestelstatus:\n${trackingUrl}\n` : '',
    'Met vriendelijke groet,',
    'INTERSPORT Backoffice',
  ]
    .filter(Boolean)
    .join('\n')

  return sendMail({
    to,
    replyTo: order.store_manager_email,
    subject,
    text,
    html,
  })
}

export async function sendOrderManagerOrderCreatedEmail(
  to: string,
  order: OrderNotificationOrder
) {
  if (!to) {
    return { skipped: true, reason: 'Geen bestelverantwoordelijke-mailadres aanwezig.' }
  }

  const storeName = getStoreName(order.stores)
  const trackingUrl = getPublicOrderTrackingUrl(order.tracking_token)
  const subject = `Nieuwe artikelbestelling voor order ${order.order_number}`
  const html = emailLayout({
    title: 'Nieuwe artikelbestelling',
    preheader: `Order ${order.order_number} moet worden besteld door de bestelverantwoordelijke.`,
    intro: [
      'Beste bestelverantwoordelijke,',
      `Er is een nieuwe order aangemaakt waarbij de artikelen door de bestelverantwoordelijke besteld moeten worden.`,
      `De order is aangemaakt voor ${order.club_name} vanuit ${storeName}.`,
    ],
    statusLabel: 'Actie vereist',
    statusValue: 'Artikelen bestellen',
    order,
    storeName,
    trackingUrl: order.order_detail_url ?? trackingUrl,
    ctaLabel: order.order_detail_url ? 'Open order in backoffice' : 'Bekijk bestelstatus',
    footerNote: 'Open de order in de backoffice om de artikelbestelling verder op te pakken.',
  })
  const text = [
    'Beste bestelverantwoordelijke,',
    '',
    'Er is een nieuwe order aangemaakt waarbij de artikelen door de bestelverantwoordelijke besteld moeten worden.',
    '',
    `Ordernummer: ${order.order_number}`,
    `Winkel: ${storeName}`,
    `Naam: ${order.club_name}`,
    `Artikelenstatus: ${translateArticleStatus(order.article_status)}`,
    `Deadline: ${formatDate(order.deadline)}`,
    `Uitleverdatum: ${formatDate(order.delivery_date)}`,
    '',
    'Bestelde producten:',
    formatItems(order.order_items),
    '',
    order.order_detail_url ? `Open de order in de backoffice:\n${order.order_detail_url}\n` : '',
    'Met vriendelijke groet,',
    'INTERSPORT Backoffice',
  ]
    .filter(Boolean)
    .join('\n')

  return sendMail({
    to,
    replyTo: order.store_manager_email,
    subject,
    text,
    html,
  })
}

export async function sendStoreManagerArticleOrderCreatedEmail(
  to: string,
  order: OrderNotificationOrder
) {
  if (!to) {
    return { skipped: true, reason: 'Geen hoofdverantwoordelijke winkel-mailadres aanwezig.' }
  }

  const storeName = getStoreName(order.stores)
  const trackingUrl = getPublicOrderTrackingUrl(order.tracking_token)
  const subject = `Artikelen bestellen voor order ${order.order_number}`
  const html = emailLayout({
    title: 'Artikelen bestellen',
    preheader: `Order ${order.order_number} moet door de winkel worden besteld.`,
    intro: [
      'Beste winkelverantwoordelijke,',
      'Er is een nieuwe order aangemaakt waarbij de artikelen door de winkel besteld moeten worden.',
      `De order is aangemaakt voor ${order.club_name} vanuit ${storeName}.`,
    ],
    statusLabel: 'Actie vereist',
    statusValue: 'Bestellen door winkel',
    order,
    storeName,
    trackingUrl: order.order_detail_url ?? trackingUrl,
    ctaLabel: order.order_detail_url ? 'Open order in backoffice' : 'Bekijk bestelstatus',
    footerNote: 'Open de order in de backoffice om de artikelbestelling verder op te pakken.',
  })
  const text = [
    'Beste winkelverantwoordelijke,',
    '',
    'Er is een nieuwe order aangemaakt waarbij de artikelen door de winkel besteld moeten worden.',
    '',
    `Ordernummer: ${order.order_number}`,
    `Winkel: ${storeName}`,
    `Naam: ${order.club_name}`,
    `Artikelenstatus: ${translateArticleStatus(order.article_status)}`,
    `Deadline: ${formatDate(order.deadline)}`,
    `Uitleverdatum: ${formatDate(order.delivery_date)}`,
    '',
    'Bestelde producten:',
    formatItems(order.order_items),
    '',
    order.order_detail_url ? `Open de order in de backoffice:\n${order.order_detail_url}\n` : '',
    'Met vriendelijke groet,',
    'INTERSPORT Backoffice',
  ]
    .filter(Boolean)
    .join('\n')

  return sendMail({
    to,
    replyTo: order.store_manager_email,
    subject,
    text,
    html,
  })
}
