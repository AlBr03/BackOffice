import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadPersonalSettings } from '@/lib/business-settings-server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
  }

  const body = (await request.json()) as { mode?: string }
  const mode = body.mode === 'dark' ? 'dark' : body.mode === 'light' ? 'light' : null

  if (!mode) {
    return NextResponse.json({ error: 'Ongeldige weergavemodus.' }, { status: 400 })
  }
  const { settings: personal, error: preferencesError } = await loadPersonalSettings(user.id)
  if (!preferencesError) {
    const { error: saveError } = await supabase.from('user_preferences').upsert({ user_id: user.id, preferences: { ...personal, mode }, updated_at: new Date().toISOString() })
    if (saveError) return NextResponse.json({ error: 'Weergavevoorkeur kon niet worden opgeslagen.' }, { status: 503 })
  }

  const response = NextResponse.json({ success: true })

  response.cookies.set('ui-mode', mode, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })

  return response
}
