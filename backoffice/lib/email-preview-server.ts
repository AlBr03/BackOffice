import 'server-only'
import { mailPreviewContext } from '@/lib/mail-preview-context'
import * as mail from '@/lib/order-notifications'
import type { BusinessSettings, EmailKey } from '@/lib/business-settings'

export async function renderEmailPreview(settings: BusinessSettings, event: EmailKey) {
  const to = 'voorbeeld@example.invalid'
  const order = { order_number: 'ORD-VOORBEELD', tracking_token: 'voorbeeld', club_name: 'Voorbeeldvereniging', customer_email: to, article_status: 'new', print_status: 'new', notes: 'Voorbeeldorder', has_print: true, deadline: '2026-10-30', delivery_date: '2026-10-29', expected_article_delivery_date: '2026-10-20', article_out_of_stock: true, article_order_responsibility: 'order_manager', print_supplier: 'Voorbeeldleverancier', print_instructions: 'Voorbeeldbedrukking', store_manager_email: to, order_detail_url: 'https://voorbeeld.invalid/dashboard/orders/voorbeeld', stores: { name: 'Voorbeeldwinkel' }, order_items: [{ product: 'Teamshirt', quantity: 10, product_code: 'SHIRT-1', size: 'M' }] }
  let captured: { subject: string; text: string; html: string } | null = null
  await mailPreviewContext.run({ settings, capture: (message) => { captured = message } }, async () => {
    switch (event) {
      case 'created': await mail.sendOrderCreatedEmail(order); break
      case 'status_changed': await mail.sendOrderStatusChangedEmail(order, 'Voorbeeld van een statuswijziging'); break
      case 'ready': await mail.sendOrderReadyForPickupEmail({ ...order, article_status: 'at_location', print_status: 'completed' }); break
      case 'completed': await mail.sendOrderCompletedEmail({ ...order, article_status: 'completed', print_status: 'completed' }); break
      case 'proof_ready': await mail.sendPrintProofReadyEmail(order); break
      case 'proof_approved': await mail.sendPrintProofReviewedEmail(to, order, 'approved'); break
      case 'proof_rejected': await mail.sendPrintProofReviewedEmail(to, order, 'rejected', 'Voorbeeldfeedback'); break
      case 'print_created': await mail.sendPrintOrderCreatedEmail(to, order); break
      case 'purchase_created': await mail.sendOrderManagerOrderCreatedEmail(to, order); break
      case 'store_created': await mail.sendStoreManagerArticleOrderCreatedEmail(to, order); break
      case 'article_order': await mail.sendArticleOrderReminderEmail(to, order); break
      case 'logo_order': await mail.sendLogoOrderReminderEmail(to, order); break
      case 'article_arrival': await mail.sendArticleArrivalReminderEmail(to, order); break
      case 'article_delivery': await mail.sendArticleDeliveryReminderEmail(to, order); break
    }
  })
  if (!captured) throw new Error('Mailvoorbeeld kon niet worden gemaakt.')
  return captured
}
