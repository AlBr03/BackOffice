import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendOrderCreatedEmail,
  sendOrderStatusChangedEmail,
} from '@/lib/order-notifications'
import { STORE_MANAGER_ROLE } from '@/lib/roles'

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

  const body = (await request.json()) as
    | { type?: 'created' | 'status_changed'; changeSummary?: string }
    | undefined

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      `
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
  }

  if (body?.type === 'status_changed' && body.changeSummary) {
    const result = await sendOrderStatusChangedEmail(notificationOrder, body.changeSummary)
    return NextResponse.json({ ok: true, ...result })
  }

  const result = await sendOrderCreatedEmail(notificationOrder)
  return NextResponse.json({ ok: true, ...result })
}
