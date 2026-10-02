import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validatePersonalSettings } from '@/lib/business-settings'

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
  let preferences
  try { preferences = validatePersonalSettings(await request.json()) }
  catch (cause) { return NextResponse.json({ error: cause instanceof Error ? cause.message : 'Ongeldige voorkeuren.' }, { status: 400 }) }
  const { error } = await supabase.from('user_preferences').upsert({ user_id: user.id, preferences, updated_at: new Date().toISOString() })
  if (error) return NextResponse.json({ error: 'Voorkeuren konden niet worden opgeslagen. Controleer de databasemigratie.' }, { status: 503 })
  const response = NextResponse.json({ preferences })
  response.cookies.set('ui-mode', preferences.mode, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 31536000 })
  return response
}
