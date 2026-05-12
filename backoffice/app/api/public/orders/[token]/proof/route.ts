import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type RouteContext = {
  params: Promise<{ token: string }>
}

type PrintProofStatus = 'approved' | 'rejected'

function isPrintProofStatus(value: unknown): value is PrintProofStatus {
  return value === 'approved' || value === 'rejected'
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
    .select('id, order_number, has_print')
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

  return NextResponse.json({ ok: true })
}
