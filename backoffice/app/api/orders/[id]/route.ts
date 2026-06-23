import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isOfficeLikeRole, STORE_MANAGER_ROLE } from '@/lib/roles'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function DELETE(_: Request, context: RouteContext) {
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

  const admin = createAdminClient()
  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('store_id')
    .eq('id', id)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order niet gevonden.' }, { status: 404 })
  }

  const canDelete =
    isOfficeLikeRole(profile?.role) ||
    (profile?.role === STORE_MANAGER_ROLE && profile.store_id === order.store_id)

  if (!canDelete) {
    return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 })
  }

  const { data: files } = await admin
    .from('order_files')
    .select('file_path')
    .eq('order_id', id)

  const filePaths = (files ?? [])
    .map((file) => file.file_path)
    .filter((filePath): filePath is string => Boolean(filePath))

  if (filePaths.length > 0) {
    const { error: storageError } = await admin.storage.from('print-files').remove(filePaths)

    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 400 })
    }
  }

  const { error: deleteError } = await admin.from('orders').delete().eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
