import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canManageDropdowns } from '@/lib/dropdown-settings'
import { validateBusinessSettings, EMAIL_NAMES, type EmailKey } from '@/lib/business-settings'
import { renderEmailPreview } from '@/lib/email-preview-server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!canManageDropdowns(profile?.role)) return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 })
  try {
    const body = await request.json()
    if (typeof body.event !== 'string' || !Object.hasOwn(EMAIL_NAMES, body.event)) throw new Error('Onbekende mailtemplate.')
    const settings = validateBusinessSettings(body.settings)
    const preview = await renderEmailPreview(settings, body.event as EmailKey)
    return NextResponse.json({ preview })
  } catch (cause) { return NextResponse.json({ error: cause instanceof Error ? cause.message : 'Voorbeeld kon niet worden gemaakt.' }, { status: 400 }) }
}
