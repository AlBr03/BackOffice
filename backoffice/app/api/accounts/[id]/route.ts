import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isOfficeLikeRole, isStoreLikeRole } from '@/lib/roles'

const ALLOWED_ROLES = new Set(['pending', 'store', 'store_manager', 'office', 'print', 'admin'])

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !isOfficeLikeRole(profile.role)) {
    return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 })
  }

  const body = (await request.json()) as
    | { full_name?: string; role?: string | null; store_id?: string | null }
    | undefined

  const role = body?.role ?? 'pending'

  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: 'Ongeldige rol.' }, { status: 400 })
  }

  const storeId = isStoreLikeRole(role) ? body?.store_id ?? null : null
  const admin = createAdminClient()

  const { error } = await admin.from('profiles').upsert({
    id,
    full_name: body?.full_name?.trim() || null,
    role,
    store_id: storeId,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
