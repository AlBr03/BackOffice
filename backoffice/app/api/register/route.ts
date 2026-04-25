import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const body = (await request.json()) as
    | { fullName?: string; email?: string; password?: string }
    | undefined

  const fullName = body?.fullName?.trim()
  const email = body?.email?.trim().toLowerCase()
  const password = body?.password

  if (!fullName || !email || !password) {
    return NextResponse.json({ error: 'Vul naam, e-mailadres en wachtwoord in.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  })

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? 'Account kon niet worden aangemaakt.' },
      { status: 400 }
    )
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: data.user.id,
    full_name: fullName,
    role: 'pending',
    store_id: null,
  })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
