import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canManageDropdowns, validateDropdownSettings, mergeDropdownSettings, DROPDOWN_KEYS } from '@/lib/dropdown-settings'
import { loadBusinessSettings } from '@/lib/business-settings-server'

async function requireManager() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user, error: NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, user, error: canManageDropdowns(profile?.role) ? null : NextResponse.json({ error: 'Alleen beheerders en hoofdkantoor mogen keuzelijsten beheren.' }, { status: 403 }) }
}

export async function GET() {
  const { supabase, error } = await requireManager()
  if (error) return error
  const { data, error: readError } = await supabase.from('dropdown_settings').select('options, version').eq('id', 1).single()
  if (readError || !data) return NextResponse.json({ error: 'Keuzelijstbeheer is niet beschikbaar. Controleer of de databasemigratie is uitgevoerd.' }, { status: 503 })
  return NextResponse.json({ settings: mergeDropdownSettings(data.options), version: data.version })
}

export async function PUT(request: Request) {
  const { supabase, user, error } = await requireManager()
  if (error) return error
  let settings
  let version: number
  try {
    const body = await request.json()
    if (!Number.isSafeInteger(body?.version) || body.version < 0) throw new Error('Ongeldige versie.')
    version = body.version
    settings = validateDropdownSettings(body.settings)
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : 'Ongeldige keuzelijsten.' }, { status: 400 })
  }
  const { data: previous, error: readError } = await supabase.from('dropdown_settings').select('options, version').eq('id', 1).single()
  if (readError || !previous) return NextResponse.json({ error: 'Keuzelijstbeheer is niet beschikbaar. Controleer de databasemigratie.' }, { status: 503 })
  if (previous.version !== version) return NextResponse.json({ error: 'Een andere beheerder heeft de keuzelijsten gewijzigd. Herlaad de pagina voordat je opnieuw opslaat.' }, { status: 409 })
  const existing = mergeDropdownSettings(previous.options)
  if (DROPDOWN_KEYS.some((key) => existing[key].some((option) => !settings[key].some((item) => item.value === option.value)))) {
    return NextResponse.json({ error: 'Opgeslagen opties kunnen worden verborgen, maar niet verwijderd.' }, { status: 400 })
  }
  const { settings: business } = await loadBusinessSettings()
  const defaults = [business.defaults, ...Object.values(business.stores).flatMap((store) => store.defaults ? [store.defaults] : [])]
  if (defaults.some((value) => !settings.article_order_responsibility.some((option) => option.value === value.responsibility && option.enabled))) {
    return NextResponse.json({ error: 'Deze bestelverantwoordelijkheid wordt gebruikt als orderdefault. Pas eerst de bedrijfsinstellingen aan.' }, { status: 400 })
  }
  const { data, error: saveError } = await supabase.from('dropdown_settings')
    .update({ options: settings, version: version + 1, updated_at: new Date().toISOString(), updated_by: user!.id })
    .eq('id', 1).eq('version', version).select('version').maybeSingle()
  if (saveError) return NextResponse.json({ error: 'Keuzelijsten konden niet worden opgeslagen. Controleer de database-inrichting.' }, { status: 503 })
  if (!data) return NextResponse.json({ error: 'Een andere beheerder heeft de keuzelijsten gewijzigd. Herlaad de pagina voordat je opnieuw opslaat.' }, { status: 409 })
  return NextResponse.json({ settings, version: data.version })
}
