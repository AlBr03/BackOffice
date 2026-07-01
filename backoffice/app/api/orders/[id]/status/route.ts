import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  ARTICLE_STATUS_OPTIONS,
  PRINT_STATUS_OPTIONS,
  deriveLegacyStatus,
  getInitialPrintStatus,
  translateArticleStatus,
  translatePrintStatus,
} from '@/lib/order-status'
import { isOfficeLikeRole, isStoreLikeRole, STORE_MANAGER_ROLE } from '@/lib/roles'
import {
  sendOrderCompletedEmail,
  sendOrderReadyForPickupEmail,
  sendOrderStatusChangedEmail,
  shouldSendOrderCompletedEmail,
  shouldSendOrderReadyForPickupEmail,
} from '@/lib/order-notifications'

type RouteContext = {
  params: Promise<{ id: string }>
}

const ARTICLE_STATUSES = new Set<string>(ARTICLE_STATUS_OPTIONS.map((option) => option.value))
const PRINT_STATUSES = new Set<string>(PRINT_STATUS_OPTIONS.map((option) => option.value))

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, store_id')
    .eq('id', user.id)
    .single()

  const body = (await request.json()) as
    | { articleStatus?: unknown; printStatus?: unknown }
    | undefined

  const requestedArticleStatus =
    typeof body?.articleStatus === 'string' ? body.articleStatus : null
  const requestedPrintStatus =
    typeof body?.printStatus === 'string' ? body.printStatus : null

  if (requestedArticleStatus && !ARTICLE_STATUSES.has(requestedArticleStatus)) {
    return NextResponse.json({ error: 'Ongeldige artikelenstatus.' }, { status: 400 })
  }

  if (requestedPrintStatus && !PRINT_STATUSES.has(requestedPrintStatus)) {
    return NextResponse.json({ error: 'Ongeldige printstatus.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: order, error: orderError } = await admin
    .from('orders')
    .select(
      `
      id,
      order_number,
      tracking_token,
      club_name,
      customer_email,
      article_status,
      print_status,
      notes,
      delivery_date,
      deadline,
      store_id,
      has_print,
      stores (
        name
      ),
      order_items (
        product,
        quantity,
        product_code
      )
    `
    )
    .eq('id', id)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order niet gevonden.' }, { status: 404 })
  }

  const canManageOrder =
    isOfficeLikeRole(profile?.role) ||
    (isStoreLikeRole(profile?.role) && profile?.store_id === order.store_id)
  const canManagePrintOnly = profile?.role === 'print' && order.has_print

  if (!canManageOrder && !canManagePrintOnly) {
    return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 })
  }

  const nextArticleStatus = canManageOrder
    ? requestedArticleStatus ?? order.article_status ?? 'new'
    : order.article_status ?? 'new'
  const nextPrintStatus = order.has_print
    ? requestedPrintStatus ?? order.print_status ?? getInitialPrintStatus(true)
    : null

  const changes = []

  if (nextArticleStatus !== (order.article_status ?? 'new')) {
    changes.push(
      `Artikelenstatus gewijzigd van ${translateArticleStatus(order.article_status)} naar ${translateArticleStatus(nextArticleStatus)}`
    )
  }

  if (order.has_print && nextPrintStatus !== (order.print_status ?? getInitialPrintStatus(true))) {
    changes.push(
      `Printstatus gewijzigd van ${translatePrintStatus(order.print_status ?? getInitialPrintStatus(true))} naar ${translatePrintStatus(nextPrintStatus)}`
    )
  }

  if (changes.length === 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'De statussen zijn niet gewijzigd.' })
  }

  const changeSummary = changes.join(' | ')
  const { error: updateError } = await admin
    .from('orders')
    .update({
      article_status: nextArticleStatus,
      print_status: nextPrintStatus,
      status: deriveLegacyStatus(nextArticleStatus, order.has_print, nextPrintStatus),
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  await admin.from('order_activity_log').insert({
    order_id: id,
    action_type: 'status_changed',
    description: changeSummary,
    old_status: order.article_status,
    new_status: nextArticleStatus,
    performed_by: user.id,
  })

  let storeManagerEmail: string | null = null

  if (order.store_id) {
    const { data: storeManagerProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('store_id', order.store_id)
      .eq('role', STORE_MANAGER_ROLE)
      .limit(1)
      .maybeSingle()

    if (storeManagerProfile?.id) {
      const { data: storeManagerAuthUser } = await admin.auth.admin.getUserById(
        storeManagerProfile.id
      )

      storeManagerEmail = storeManagerAuthUser.user?.email ?? null
    }
  }

  const notificationOrder = {
    ...order,
    article_status: nextArticleStatus,
    print_status: nextPrintStatus,
    store_manager_email: storeManagerEmail,
  }

  const mailResult = shouldSendOrderCompletedEmail(notificationOrder)
    ? await sendOrderCompletedEmail(notificationOrder)
    : shouldSendOrderReadyForPickupEmail(notificationOrder)
      ? await sendOrderReadyForPickupEmail(notificationOrder)
      : await sendOrderStatusChangedEmail(notificationOrder, changeSummary)

  return NextResponse.json({ ok: true, changeSummary, mail: mailResult })
}
