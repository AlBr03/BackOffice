import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  sendOrderCreatedEmail,
  sendOrderStatusChangedEmail,
} from '@/lib/order-notifications'

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
    | { type?: 'created' | 'status_changed'; oldStatus?: string; newStatus?: string }
    | undefined

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      `
      order_number,
      tracking_token,
      club_name,
      customer_email,
      status,
      notes,
      delivery_date,
      deadline,
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

  if (body?.type === 'status_changed' && body.oldStatus && body.newStatus) {
    const result = await sendOrderStatusChangedEmail(order, body.oldStatus, body.newStatus)
    return NextResponse.json({ ok: true, ...result })
  }

  const result = await sendOrderCreatedEmail(order)
  return NextResponse.json({ ok: true, ...result })
}
