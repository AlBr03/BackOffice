import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isOfficeLikeRole, isStoreLikeRole } from '@/lib/roles'

type RouteContext = {
  params: Promise<{ id: string; fileId: string }>
}

export async function GET(_: Request, context: RouteContext) {
  const { id, fileId } = await context.params
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

  const admin = createAdminClient()
  const [{ data: order, error: orderError }, { data: file, error: fileError }] =
    await Promise.all([
      admin
        .from('orders')
        .select('store_id, has_print')
        .eq('id', id)
        .single(),
      admin
        .from('order_files')
        .select('file_path')
        .eq('id', fileId)
        .eq('order_id', id)
        .single(),
    ])

  if (orderError || !order || fileError || !file) {
    return NextResponse.json({ error: 'Bestand niet gevonden.' }, { status: 404 })
  }

  const canView =
    isOfficeLikeRole(profile?.role) ||
    (profile?.role === 'print' && order.has_print) ||
    (isStoreLikeRole(profile?.role) && profile?.store_id === order.store_id)

  if (!canView) {
    return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 })
  }

  const { data, error } = await admin.storage
    .from('print-files')
    .createSignedUrl(file.file_path, 5 * 60)

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? 'Bestandslink kon niet worden aangemaakt.' },
      { status: 400 }
    )
  }

  return NextResponse.redirect(data.signedUrl)
}
