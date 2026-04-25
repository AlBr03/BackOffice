import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  if (!profile || (profile.role !== 'office' && profile.role !== 'admin')) {
    return {
      supabase,
      error: NextResponse.json({ error: 'Geen toegang.' }, { status: 403 }),
    }
  }

  return { supabase, error: null as NextResponse<unknown> | null }
}

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const { supabase, error } = await requireOfficeLikeUser()

  if (error) return error

  const { id } = await context.params
  const body = (await request.json()) as { name?: string }
  const name = body.name?.trim()

  if (!name) {
    return NextResponse.json({ error: 'Naam is verplicht.' }, { status: 400 })
  }

  const { error: updateError } = await supabase.from('stores').update({ name }).eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(_: Request, context: RouteContext) {
  const { supabase, error } = await requireOfficeLikeUser()

  if (error) return error

  const { id } = await context.params

  const { data: linkedProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('store_id', id)
    .limit(1)

  if ((linkedProfiles ?? []).length > 0) {
    return NextResponse.json(
      { error: 'Deze winkel is nog gekoppeld aan een of meer accounts.' },
      { status: 400 }
    )
  }

  const { data: linkedOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('store_id', id)
    .limit(1)

  if ((linkedOrders ?? []).length > 0) {
    return NextResponse.json(
      { error: 'Deze winkel is nog gekoppeld aan bestaande orders.' },
      { status: 400 }
    )
  }

  const { error: deleteError } = await supabase.from('stores').delete().eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
