import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendOrderCompletedEmail,
  sendOrderManagerOrderCreatedEmail,
  sendOrderReadyForPickupEmail,
  sendPrintOrderCreatedEmail,
  sendOrderCreatedEmail,
  sendOrderStatusChangedEmail,
  sendPrintProofReadyEmail,
  shouldSendOrderCompletedEmail,
  shouldSendOrderReadyForPickupEmail,
} from '@/lib/order-notifications'
import { getPublicAppUrl } from '@/lib/public-url'
import {
  isOfficeLikeRole,
  isStoreLikeRole,
  ORDER_MANAGER_ROLE,
  PRINT_ROLE,
  STORE_MANAGER_ROLE,
} from '@/lib/roles'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
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
    | {
        type?: 'created' | 'status_changed' | 'print_proof_ready'
        changeSummary?: string
        fileName?: string
      }
    | undefined

  const { data: order, error } = await supabase
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
      print_status,
      print_instructions,
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

  if (error || !order) {
    return NextResponse.json({ error: 'Order niet gevonden.' }, { status: 404 })
  }

  const canNotify =
    isOfficeLikeRole(profile?.role) ||
    (profile?.role === 'print' && order.has_print) ||
    (isStoreLikeRole(profile?.role) && profile?.store_id === order.store_id)

  if (!canNotify) {
    return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 })
  }

  let storeManagerEmail: string | null = null

  if (order.store_id) {
    const { data: storeManagerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('store_id', order.store_id)
      .eq('role', STORE_MANAGER_ROLE)
      .limit(1)
      .maybeSingle()

    if (storeManagerProfile?.id) {
      try {
        const admin = createAdminClient()
        const { data: storeManagerAuthUser } = await admin.auth.admin.getUserById(
          storeManagerProfile.id
        )

        storeManagerEmail = storeManagerAuthUser.user?.email ?? null
      } catch (managerEmailError) {
        console.error(
          'Hoofdverantwoordelijke winkelmail kon niet worden opgehaald',
          managerEmailError
        )
      }
    }
  }

  const notificationOrder = {
    ...order,
    store_manager_email: storeManagerEmail,
    order_detail_url: getPublicAppUrl()
      ? `${getPublicAppUrl()}/dashboard/orders/${id}`
      : null,
  }

  if (body?.type === 'status_changed' && body.changeSummary) {
    const result = shouldSendOrderCompletedEmail(notificationOrder)
      ? await sendOrderCompletedEmail(notificationOrder)
      : shouldSendOrderReadyForPickupEmail(notificationOrder)
        ? await sendOrderReadyForPickupEmail(notificationOrder)
        : await sendOrderStatusChangedEmail(notificationOrder, body.changeSummary)
    return NextResponse.json({ ok: true, ...result })
  }

  if (body?.type === 'print_proof_ready') {
    const admin = createAdminClient()
    const fileName = typeof body.fileName === 'string' && body.fileName.trim()
      ? body.fileName.trim()
      : 'printvoorbeeld'

    if (!order.has_print) {
      return NextResponse.json(
        { error: 'Voor deze order is geen printvoorbeeld van toepassing.' },
        { status: 400 }
      )
    }

    const { data: printPreviewFiles } = await admin
      .from('order_files')
      .select('id')
      .eq('order_id', id)
      .not('file_path', 'like', '%/customer-logos/%')
      .limit(1)

    if ((printPreviewFiles ?? []).length === 0) {
      return NextResponse.json(
        { error: 'Er is nog geen printvoorbeeldbestand toegevoegd.' },
        { status: 400 }
      )
    }

    const { error: proofUpdateError } = await admin
      .from('orders')
      .update({
        print_proof_status: 'pending',
        print_proof_feedback: null,
        print_proof_responded_at: null,
      })
      .eq('id', id)

    if (proofUpdateError) {
      return NextResponse.json({ error: proofUpdateError.message }, { status: 400 })
    }

    const { error: activityError } = await admin.from('order_activity_log').insert({
      order_id: id,
      action_type: 'print_proof_ready',
      description: `Printvoorbeeld klaar voor beoordeling: ${fileName}`,
      performed_by: user.id,
    })

    if (activityError) {
      return NextResponse.json({ error: activityError.message }, { status: 400 })
    }

    const result = await sendPrintProofReadyEmail(notificationOrder)
    return NextResponse.json({ ok: true, ...result })
  }

  const customerResult = await sendOrderCreatedEmail(notificationOrder)
  let orderManagerResults:
    | {
        total: number
        sent: number
        failed: number
      }
    | undefined
  let printResults:
    | {
        total: number
        sent: number
        failed: number
      }
    | undefined

  async function sendRoleNotification(
    role: string,
    sender: (email: string) => Promise<unknown>
  ) {
    const admin = createAdminClient()
    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('id')
      .eq('role', role)

    if (profilesError) {
      console.error(`Profielen voor rol ${role} konden niet worden opgehaald`, profilesError)
      return { total: 0, sent: 0, failed: 1 }
    }

    const emails = (
      await Promise.all(
        (profiles ?? []).map(async (profile) => {
          const { data } = await admin.auth.admin.getUserById(profile.id)
          return data.user?.email ?? null
        })
      )
    ).filter((email): email is string => Boolean(email))

    const results = await Promise.allSettled(emails.map(sender))

    return {
      total: emails.length,
      sent: results.filter((result) => result.status === 'fulfilled').length,
      failed: results.filter((result) => result.status === 'rejected').length,
    }
  }

  if (order.article_order_responsibility === ORDER_MANAGER_ROLE) {
    orderManagerResults = await sendRoleNotification(ORDER_MANAGER_ROLE, (email) =>
      sendOrderManagerOrderCreatedEmail(email, notificationOrder)
    )
  }

  if (order.has_print) {
    printResults = await sendRoleNotification(PRINT_ROLE, (email) =>
      sendPrintOrderCreatedEmail(email, notificationOrder)
    )
  }

  return NextResponse.json({
    ok: true,
    customer: customerResult,
    orderManager: orderManagerResults,
    print: printResults,
  })
}
