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
    .select('id, order_number, has_print, logo_action')
    .eq('tracking_token', token)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Bestelling niet gevonden.' }, { status: 404 })
  }

  if (!order.has_print || order.logo_action !== 'klant_aanleveren') {
    return NextResponse.json(
      { error: "Voor deze bestelling hoeven geen logo's aangeleverd te worden." },
      { status: 400 }
    )
  }

  const formData = await request.formData()
  const files = formData
    .getAll('files')
    .filter((value): value is File => value instanceof File)
  const legacyFile = formData.get('file')

  if (legacyFile instanceof File) {
    files.push(legacyFile)
  }

  if (files.length === 0) {
    return NextResponse.json({ error: 'Selecteer minimaal een bestand.' }, { status: 400 })
  }

  for (const file of files) {
    const extension = getExtension(file.name)

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: `${file.name} is geen .ai of .eps bestand.` },
        { status: 400 }
      )
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: `${file.name} is leeg.` }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `${file.name} is groter dan 50 MB.` },
        { status: 400 }
      )
    }
  }

  const uploadedFiles: {
    filePath: string
    fileName: string
    mimeType: string | null
  }[] = []

  for (const [index, file] of files.entries()) {
    const safeFileName = getSafeFileName(file.name)
    const filePath = `${order.id}/customer-logos/${Date.now()}-${index}-${safeFileName}`
    const { error: uploadError } = await supabase.storage
      .from('print-files')
      .upload(filePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      if (uploadedFiles.length > 0) {
        await supabase.storage.from('print-files').remove(uploadedFiles.map((item) => item.filePath))
      }

      return NextResponse.json({ error: uploadError.message }, { status: 400 })
    }

    uploadedFiles.push({
      filePath,
      fileName: file.name,
      mimeType: file.type || null,
    })
  }

  const { error: dbError } = await supabase.from('order_files').insert(
    uploadedFiles.map((file) => ({
      order_id: order.id,
      file_path: file.filePath,
      file_name: file.fileName,
      mime_type: file.mimeType,
    }))
  )

  if (dbError) {
    await supabase.storage.from('print-files').remove(uploadedFiles.map((file) => file.filePath))
    return NextResponse.json({ error: dbError.message }, { status: 400 })
  }

  await supabase.from('order_activity_log').insert({
    order_id: order.id,
    action_type: 'customer_logo_uploaded',
    description:
      uploadedFiles.length === 1
        ? `Logo geupload door klant: ${uploadedFiles[0].fileName}`
        : `${uploadedFiles.length} logo's geupload door klant`,
    performed_by: null,
  })

  return NextResponse.json({
    ok: true,
    uploaded: uploadedFiles.length,
    fileNames: uploadedFiles.map((file) => file.fileName),
  })
}
