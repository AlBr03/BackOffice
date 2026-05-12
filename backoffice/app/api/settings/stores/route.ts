import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isOfficeLikeRole } from '@/lib/roles'

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

  if (error) return error

  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select('id, name')
    .order('name')

  if (storesError) {
    return NextResponse.json({ error: storesError.message }, { status: 400 })
  }

  return NextResponse.json({ stores: stores ?? [] })
}

export async function POST(request: Request) {
  const { supabase, error } = await requireOfficeLikeUser()

  if (error) return error

  const body = (await request.json()) as { name?: string }
  const name = body.name?.trim()

  if (!name) {
    return NextResponse.json({ error: 'Naam is verplicht.' }, { status: 400 })
  }

  const { data: store, error: insertError } = await supabase
    .from('stores')
    .insert({ name })
    .select('id, name')
    .single()

  if (insertError || !store) {
    return NextResponse.json(
      { error: insertError?.message ?? 'Winkel kon niet worden toegevoegd.' },
      { status: 400 }
    )
  }

  return NextResponse.json({ store })
}
