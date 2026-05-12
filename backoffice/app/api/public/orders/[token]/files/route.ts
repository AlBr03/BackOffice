import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_EXTENSIONS = new Set(['ai', 'eps'])
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

type RouteContext = {
  params: Promise<{ token: string }>
}

function getExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

function getSafeFileName(fileName: string) {
  const sanitized = fileName
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return sanitized || 'logo.ai'
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { token } = await context.params

  if (!token) {
    return NextResponse.json({ error: 'Ongeldige uploadlink.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number')
    .eq('tracking_token', token)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Bestelling niet gevonden.' }, { status: 404 })
  }

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Selecteer een bestand.' }, { status: 400 })
  }

  const extension = getExtension(file.name)

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return NextResponse.json(
      { error: 'Alleen .ai en .eps bestanden zijn toegestaan.' },
      { status: 400 }
    )
  }

  if (file.size <= 0) {
    return NextResponse.json({ error: 'Het bestand is leeg.' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: 'Het bestand mag maximaal 50 MB zijn.' }, { status: 400 })
  }

  const safeFileName = getSafeFileName(file.name)
  const filePath = `${order.id}/customer-logos/${Date.now()}-${safeFileName}`
  const { error: uploadError } = await supabase.storage
    .from('print-files')
    .upload(filePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 })
  }

  const { error: dbError } = await supabase.from('order_files').insert({
    order_id: order.id,
    file_path: filePath,
    file_name: file.name,
    mime_type: file.type || null,
  })

  if (dbError) {
    await supabase.storage.from('print-files').remove([filePath])
    return NextResponse.json({ error: dbError.message }, { status: 400 })
  }

  await supabase.from('order_activity_log').insert({
    order_id: order.id,
    action_type: 'customer_logo_uploaded',
    description: `Logo geupload door klant: ${file.name}`,
    performed_by: null,
  })

  return NextResponse.json({
    ok: true,
    fileName: file.name,
  })
}
