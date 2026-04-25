import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  if (!profile || (profile.role !== 'office' && profile.role !== 'admin')) {
    return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 })
  }

  const body = (await request.json()) as
    | { full_name?: string; role?: string | null; store_id?: string | null }
    | undefined

  const role = body?.role ?? 'pending'
  const storeId = role === 'store' ? body?.store_id ?? null : null

  const { error } = await supabase.from('profiles').upsert({
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
