import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isOfficeLikeRole, isStoreLikeRole } from '@/lib/roles'

const ALLOWED_ROLES = new Set([
  'pending',
  'store',
  'store_manager',
  'office',
  'order_manager',
  'print',
  'admin',
])

async function requireOfficeLikeUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      supabase,
      error: NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 }),
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !isOfficeLikeRole(profile.role)) {
    return {
      supabase,
      error: NextResponse.json({ error: 'Geen toegang.' }, { status: 403 }),
    }
  }

  return { supabase, error: null as NextResponse<unknown> | null }
}

export async function GET() {
  const { supabase, error } = await requireOfficeLikeUser()
  const admin = createAdminClient()
  if (error) return error

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

export async function POST(request: Request) {
  const { error } = await requireOfficeLikeUser()

  if (error) return error

  const body = (await request.json()) as
    | {
        full_name?: string
        email?: string
        password?: string
        role?: string | null
        store_id?: string | null
      }
    | undefined

  const fullName = body?.full_name?.trim()
  const email = body?.email?.trim().toLowerCase()
  const password = body?.password
  const role = body?.role || 'pending'

  if (!fullName || !email || !password) {
    return NextResponse.json({ error: 'Vul naam, e-mailadres en wachtwoord in.' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Wachtwoord moet minimaal 8 tekens zijn.' }, { status: 400 })
  }

  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: 'Ongeldige rol.' }, { status: 400 })
  }

  const storeId = isStoreLikeRole(role) ? body?.store_id ?? null : null

  if (isStoreLikeRole(role) && !storeId) {
    return NextResponse.json({ error: 'Selecteer een winkel voor deze rol.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  })

  if (createError || !data.user) {
    return NextResponse.json(
      { error: createError?.message ?? 'Account kon niet worden aangemaakt.' },
      { status: 400 }
    )
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: data.user.id,
    full_name: fullName,
    role,
    store_id: storeId,
  })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({
    account: {
      id: data.user.id,
      email: data.user.email ?? email,
      created_at: data.user.created_at,
      full_name: fullName,
      role,
      store_id: storeId,
    },
  })
}
