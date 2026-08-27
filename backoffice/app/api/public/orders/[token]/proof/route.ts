import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPrintProofReviewedEmail } from '@/lib/order-notifications'
import { getPublicAppUrl } from '@/lib/public-url'
import { PRINT_ROLE, STORE_MANAGER_ROLE } from '@/lib/roles'

type RouteContext = {
  params: Promise<{ token: string }>
}

type PrintProofStatus = 'approved' | 'rejected'

function isPrintProofStatus(value: unknown): value is PrintProofStatus {
  return value === 'approved' || value === 'rejected'
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
    console.error(`Profielen voor rol ${role} konden niet worden opgehaald`, error)
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

async function notifyPrintDepartment(
  order: {
    id: string
    order_number: string
    tracking_token?: string | null
    club_name: string
    customer_email: string | null
    article_status: string | null
    print_status: string | null
    has_print?: boolean | null
    notes: string | null
    print_supplier?: string | null
    print_instructions?: string | null
    delivery_date: string | null
    deadline: string | null
    store_id: string | null
    stores?: { name?: string | null } | { name?: string | null }[] | null
    order_items?: {
      product: string
      quantity: number
      product_code: string | null
      size?: string | null
    }[] | null
  },
  status: PrintProofStatus,
  feedback: string
) {
  const emails = await getRoleEmails(PRINT_ROLE)

  if (emails.length === 0) {
    return {
      total: 0,
      sent: 0,
      skipped: 1,
      failed: 0,
      reason: 'Geen printafdeling-ontvangers gevonden.',
    }
  }

  const storeManagerEmail = (await getRoleEmails(STORE_MANAGER_ROLE, order.store_id))[0] ?? null
  const appUrl = getPublicAppUrl()
  const notificationOrder = {
    ...order,
    store_manager_email: storeManagerEmail,
    order_detail_url: appUrl ? `${appUrl}/dashboard/orders/${order.id}` : null,
  }
  const results = await Promise.allSettled(
    emails.map((email) => sendPrintProofReviewedEmail(email, notificationOrder, status, feedback))
  )
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

export async function POST(request: NextRequest, context: RouteContext) {
  const { token } = await context.params

  if (!token) {
    return NextResponse.json({ error: 'Ongeldige link.' }, { status: 400 })
  }

  const body = (await request.json()) as
    | {
        status?: unknown
        feedback?: unknown
      }
    | undefined
  const status = body?.status
  const feedback = typeof body?.feedback === 'string' ? body.feedback.trim() : ''

  if (!isPrintProofStatus(status)) {
    return NextResponse.json({ error: 'Ongeldige beoordeling.' }, { status: 400 })
  }

  if (status === 'rejected' && !feedback) {
    return NextResponse.json(
      { error: 'Geef aan wat er aangepast moet worden.' },
      { status: 400 }
    )
  }

  if (feedback.length > 2000) {
    return NextResponse.json({ error: 'Het bericht mag maximaal 2000 tekens zijn.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: order, error: orderError } = await supabase
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
      has_print,
      notes,
      print_supplier,
      print_instructions,
      delivery_date,
      deadline,
      store_id,
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
    .eq('tracking_token', token)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Bestelling niet gevonden.' }, { status: 404 })
  }

  if (!order.has_print) {
    return NextResponse.json(
      { error: 'Voor deze bestelling is geen printvoorbeeld van toepassing.' },
      { status: 400 }
    )
  }

  const { data: printPreviewFiles } = await supabase
    .from('order_files')
    .select('id')
    .eq('order_id', order.id)
    .not('file_path', 'like', '%/customer-logos/%')
    .limit(1)

  if ((printPreviewFiles ?? []).length === 0) {
    return NextResponse.json(
      { error: 'Er is nog geen printvoorbeeld om te beoordelen.' },
      { status: 400 }
    )
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      print_proof_status: status,
      print_proof_feedback: status === 'rejected' ? feedback : null,
      print_proof_responded_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  await supabase.from('order_activity_log').insert({
    order_id: order.id,
    action_type: status === 'approved' ? 'print_proof_approved' : 'print_proof_rejected',
    description:
      status === 'approved'
        ? 'Printvoorbeeld goedgekeurd door klant'
        : `Printvoorbeeld afgewezen door klant: ${feedback}`,
    performed_by: null,
  })

  const printDepartmentNotification = await notifyPrintDepartment(order, status, feedback)

  return NextResponse.json({ ok: true, printDepartmentNotification })
}
