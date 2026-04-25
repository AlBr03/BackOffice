import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const admin = createAdminClient()

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

  const [{ data: stores }, { data: authUsers, error: authError }, { data: profiles }] = await Promise.all([
    supabase.from('stores').select('id, name').order('name'),
    admin.auth.admin.listUsers(),
    supabase.from('profiles').select('id, full_name, role, store_id'),
  ])

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const accounts = (authUsers?.users ?? []).map((authUser) => {
    const matchingProfile = (profiles ?? []).find((item) => item.id === authUser.id)

    return {
      id: authUser.id,
      email: authUser.email ?? '',
      created_at: authUser.created_at,
      full_name:
        matchingProfile?.full_name ??
        (typeof authUser.user_metadata?.full_name === 'string'
          ? authUser.user_metadata.full_name
          : ''),
      role: matchingProfile?.role ?? null,
      store_id: matchingProfile?.store_id ?? null,
    }
  })

  return NextResponse.json({
    accounts,
    stores: stores ?? [],
  })
}
