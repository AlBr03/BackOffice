import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPublicAppUrl } from '@/lib/public-url'
import {
  ORDER_MANAGER_ROLE,
  PRINT_ROLE,
  STORE_MANAGER_ROLE,
} from '@/lib/roles'
import {
  sendArticleArrivalReminderEmail,
  sendArticleDeliveryReminderEmail,
  sendArticleOrderReminderEmail,
  sendLogoOrderReminderEmail,
} from '@/lib/order-notifications'

export const dynamic = 'force-dynamic'

const DAY_MS = 24 * 60 * 60 * 1000

type ReminderKind = 'article_order' | 'logo_order' | 'article_arrival' | 'article_delivery'

type ReminderOrder = {
  id: string
  order_number: string
  tracking_token?: string | null
  club_name: string
  customer_email: string | null
  article_status: string | null
  article_order_responsibility?: string | null
  article_out_of_stock?: boolean | null
  expected_article_delivery_date?: string | null
  article_delivery_reminder_days_before?: number | null
  print_status: string | null
  has_print?: boolean | null
  logo_action?: string | null
  notes: string | null
  print_supplier?: string | null
  print_instructions?: string | null
  delivery_date: string | null
  deadline: string | null
  store_id: string | null
  created_at: string | null
  article_ordered_at?: string | null
  article_order_reminder_sent_at?: string | null
  logo_order_reminder_sent_at?: string | null
  article_arrival_reminder_sent_at?: string | null
  article_delivery_reminder_sent_at?: string | null
  stores?: { name?: string | null } | { name?: string | null }[] | null
  order_items?: {
    product: string
    quantity: number
    product_code: string | null
    size?: string | null
  }[] | null
}

function getCronSecret() {
  return process.env.REMINDER_CRON_SECRET || process.env.CRON_SECRET || null
}

function isAuthorized(request: NextRequest) {
  const secret = getCronSecret()

  if (!secret) {
    return false
  }

  const authorization = request.headers.get('authorization')
  const bearerToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : null
  const headerToken = request.headers.get('x-cron-secret')?.trim() || null

  return bearerToken === secret || headerToken === secret
}

function isOlderThan(value: string | null | undefined, days: number, now: Date) {
  if (!value) return false

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false

  return date.getTime() <= now.getTime() - days * DAY_MS
}

function isDeliveryReminderDue(order: ReminderOrder, now: Date) {
  if (
    !order.article_out_of_stock ||
    !order.expected_article_delivery_date ||
    order.article_delivery_reminder_sent_at
  ) {
    return false
  }

  const expectedDate = new Date(order.expected_article_delivery_date)
  if (Number.isNaN(expectedDate.getTime())) return false

  const daysBefore = Math.max(0, order.article_delivery_reminder_days_before ?? 2)
  return expectedDate.getTime() - daysBefore * DAY_MS <= now.getTime()
}

function getSkippedResult(reason: string) {
  return {
    total: 0,
    sent: 0,
    skipped: 1,
    failed: 0,
    reason,
  }
}

async function getRoleEmails(role: string, storeId?: string | null) {
  const admin = createAdminClient()
  let query = admin
    .from('profiles')
    .select('id')
    .eq('role', role)

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data: profiles, error } = await query

  if (error) {
    console.error(`Reminderprofielen voor rol ${role} konden niet worden opgehaald`, error)
    return []
  }

  const emails = await Promise.all(
    (profiles ?? []).map(async (profile) => {
      const { data } = await admin.auth.admin.getUserById(profile.id)
      return data.user?.email ?? null
    })
  )

  return Array.from(new Set(emails.filter((email): email is string => Boolean(email))))
}

async function getStoreManagerEmail(storeId?: string | null) {
  const emails = await getRoleEmails(STORE_MANAGER_ROLE, storeId)
  return emails[0] ?? null
}

async function getArticleResponsibleEmails(order: ReminderOrder) {
  if (order.article_order_responsibility === ORDER_MANAGER_ROLE) {
    return getRoleEmails(ORDER_MANAGER_ROLE)
  }

  if (order.article_order_responsibility === STORE_MANAGER_ROLE) {
    return getRoleEmails(STORE_MANAGER_ROLE, order.store_id)
  }

  return []
}

function getReminderKinds(order: ReminderOrder, now: Date): ReminderKind[] {
  const kinds: ReminderKind[] = []
  const articleStatus = order.article_status ?? 'new'
  const printStatus = order.print_status ?? 'new'

  if (
    articleStatus === 'new' &&
    order.article_order_responsibility !== 'not_needed' &&
    !order.article_order_reminder_sent_at &&
    isOlderThan(order.created_at, 3, now)
  ) {
    kinds.push('article_order')
  }

  if (
    order.has_print &&
    order.logo_action === 'bestellen' &&
    printStatus === 'new' &&
    !order.logo_order_reminder_sent_at &&
    isOlderThan(order.created_at, 5, now)
  ) {
    kinds.push('logo_order')
  }

  if (
    articleStatus === 'ordered' &&
    !order.article_arrival_reminder_sent_at &&
    isOlderThan(order.article_ordered_at, 21, now)
  ) {
    kinds.push('article_arrival')
  }

  if (
    articleStatus !== 'at_location' &&
    articleStatus !== 'completed' &&
    isDeliveryReminderDue(order, now)
  ) {
    kinds.push('article_delivery')
  }

  return kinds
}

async function sendReminder(kind: ReminderKind, order: ReminderOrder) {
  const appUrl = getPublicAppUrl()
  const storeManagerEmail = await getStoreManagerEmail(order.store_id)
  const notificationOrder = {
    ...order,
    store_manager_email: storeManagerEmail,
    order_detail_url: appUrl ? `${appUrl}/dashboard/orders/${order.id}` : null,
  }
  const emails =
    kind === 'logo_order'
      ? await getRoleEmails(PRINT_ROLE)
      : await getArticleResponsibleEmails(order)

  if (emails.length === 0) {
    return getSkippedResult('Geen verantwoordelijke ontvanger gevonden.')
  }

  const sender =
    kind === 'logo_order'
      ? sendLogoOrderReminderEmail
      : kind === 'article_arrival'
        ? sendArticleArrivalReminderEmail
        : kind === 'article_delivery'
          ? sendArticleDeliveryReminderEmail
          : sendArticleOrderReminderEmail

  const results = await Promise.allSettled(emails.map((email) => sender(email, notificationOrder)))
  const sent = results.filter((result) => {
    if (result.status !== 'fulfilled') return false
    const value = result.value as { skipped?: boolean }
    return value.skipped !== true
  }).length
  const skipped = results.filter((result) => {
    if (result.status !== 'fulfilled') return false
    const value = result.value as { skipped?: boolean }
    return value.skipped === true
  }).length
  const failed = results.filter((result) => result.status === 'rejected').length

  return {
    total: emails.length,
    sent,
    skipped,
    failed,
  }
}

function getSentColumn(kind: ReminderKind) {
  switch (kind) {
    case 'article_order':
      return 'article_order_reminder_sent_at'
    case 'logo_order':
      return 'logo_order_reminder_sent_at'
    case 'article_arrival':
      return 'article_arrival_reminder_sent_at'
    case 'article_delivery':
      return 'article_delivery_reminder_sent_at'
  }
}

function getActivityDescription(kind: ReminderKind) {
  switch (kind) {
    case 'article_order':
      return 'Reminder verstuurd: artikelen nog niet besteld'
    case 'logo_order':
      return "Reminder verstuurd: logo's nog niet besteld"
    case 'article_arrival':
      return 'Reminder verstuurd: bestelde artikelen nog niet binnen'
    case 'article_delivery':
      return 'Reminder verstuurd: verwachte artikellevering nadert'
  }
}

export async function POST(request: NextRequest) {
  if (!getCronSecret()) {
    return NextResponse.json(
      { error: 'REMINDER_CRON_SECRET of CRON_SECRET is nog niet geconfigureerd.' },
      { status: 503 }
    )
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Geen toegang.' }, { status: 401 })
  }

  const now = new Date()
  const admin = createAdminClient()
  const { data: orders, error } = await admin
    .from('orders')
    .select(
      `
      id,
      order_number,
      tracking_token,
      club_name,
      customer_email,
      article_status,
      article_order_responsibility,
      article_out_of_stock,
      expected_article_delivery_date,
      article_delivery_reminder_days_before,
      print_status,
      has_print,
      logo_action,
      notes,
      print_supplier,
      print_instructions,
      delivery_date,
      deadline,
      store_id,
      created_at,
      article_ordered_at,
      article_order_reminder_sent_at,
      logo_order_reminder_sent_at,
      article_arrival_reminder_sent_at,
      article_delivery_reminder_sent_at,
      stores (
        name
      ),
      order_items (
        product,
        quantity,
        product_code,
        size
      )
    `
    )
    .or('article_status.eq.new,article_status.eq.ordered,print_status.eq.new,article_out_of_stock.eq.true')
    .order('created_at', { ascending: true })
    .limit(1000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const summaries: Array<{
    orderId: string
    orderNumber: string
    kind: ReminderKind
    total: number
    sent: number
    skipped: number
    failed: number
    reason?: string
  }> = []

  for (const order of (orders ?? []) as ReminderOrder[]) {
    const kinds = getReminderKinds(order, now)

    for (const kind of kinds) {
      const result = await sendReminder(kind, order)
      summaries.push({
        orderId: order.id,
        orderNumber: order.order_number,
        kind,
        ...result,
      })

      if (result.sent > 0) {
        const sentAt = new Date().toISOString()
        const sentColumn = getSentColumn(kind)
        await admin
          .from('orders')
          .update({ [sentColumn]: sentAt })
          .eq('id', order.id)
        await admin.from('order_activity_log').insert({
          order_id: order.id,
          action_type: 'reminder_sent',
          description: getActivityDescription(kind),
        })
      }
    }
  }

  return NextResponse.json({
    ok: true,
    checked: orders?.length ?? 0,
    reminders: summaries,
  })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
