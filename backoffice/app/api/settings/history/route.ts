import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canManageDropdowns } from '@/lib/dropdown-settings'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!canManageDropdowns(profile?.role)) return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 })
  const params = new URL(request.url).searchParams, category = params.get('type'), id = params.get('id')
  if (!['business', 'dropdowns'].includes(category ?? '') || (id && !/^\d{1,19}$/.test(id))) return NextResponse.json({ error: 'Ongeldig verzoek.' }, { status: 400 })
  let query = supabase.from('settings_history').select(id ? 'id, version, changed_at, actor, snapshot, previous_snapshot' : 'id, version, changed_at, actor').eq('setting_type', category!)
  if (id) query = query.eq('id', id)
  const { data, error } = await query.order('changed_at', { ascending: false }).limit(id ? 1 : 50)
  if (error) return NextResponse.json({ error: 'Wijzigingshistorie is niet beschikbaar. Controleer de databasemigratie.' }, { status: 503 })
  const rows = (data ?? []) as unknown as { id: number; version: number; changed_at: string; actor: string | null; snapshot?: unknown; previous_snapshot?: unknown }[]
  const actorIds = [...new Set(rows.map((entry) => entry.actor).filter(Boolean))]
  const { data: actors } = actorIds.length ? await supabase.from('profiles').select('id, full_name').in('id', actorIds) : { data: [] }
  return NextResponse.json({ history: rows.map((entry) => ({ ...entry, actorName: entry.actor ? (actors ?? []).find((actor) => actor.id === entry.actor)?.full_name || 'Gebruiker' : 'Systeem' })) })
}
