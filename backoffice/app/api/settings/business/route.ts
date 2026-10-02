import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canManageDropdowns } from '@/lib/dropdown-settings'
import { validateBusinessSettings, mergeBusinessSettings } from '@/lib/business-settings'
import { loadDropdownSettings } from '@/lib/dropdown-settings-server'

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!canManageDropdowns(profile?.role)) return NextResponse.json({ error: 'Alleen beheerders en hoofdkantoor mogen bedrijfsinstellingen wijzigen.' }, { status: 403 })
  let settings, version
  try {
    const body = await request.json()
    if (!Number.isSafeInteger(body.version) || body.version < 0) throw new Error('Ongeldige versie.')
    version = body.version
    settings = validateBusinessSettings(body.settings)
  } catch (cause) { return NextResponse.json({ error: cause instanceof Error ? cause.message : 'Ongeldige instellingen.' }, { status: 400 }) }
  const { data: previous, error: readError } = await supabase.from('business_settings').select('settings, version').eq('id', 1).single()
  if (readError || !previous) return NextResponse.json({ error: 'Voer eerst de databasemigratie voor bedrijfsinstellingen uit.' }, { status: 503 })
  if (previous.version !== version) return NextResponse.json({ error: 'De instellingen zijn door iemand anders gewijzigd. Herlaad de pagina.' }, { status: 409 })
  if (mergeBusinessSettings(previous.settings).suppliers.some((supplier) => !settings.suppliers.some((item) => item.id === supplier.id))) return NextResponse.json({ error: 'Opgeslagen leveranciers kunnen worden gedeactiveerd, maar niet verwijderd.' }, { status: 400 })
  const { data: stores, error: storesError } = await supabase.from('stores').select('id')
  if (storesError) return NextResponse.json({ error: 'Winkels konden niet worden gecontroleerd.' }, { status: 503 })
  if (Object.keys(settings.stores).some((id) => !(stores ?? []).some((store) => store.id === id))) return NextResponse.json({ error: 'Onbekende winkel in de instellingen.' }, { status: 400 })
  const { settings: dropdowns } = await loadDropdownSettings()
  if ([settings.defaults, ...Object.values(settings.stores).flatMap((store) => store.defaults ? [store.defaults] : [])].some((defaults) => !dropdowns.article_order_responsibility.some((option) => option.value === defaults.responsibility && option.enabled))) return NextResponse.json({ error: 'Een standaardbestelverantwoordelijkheid moet zichtbaar zijn in de keuzelijst.' }, { status: 400 })
  const { data, error } = await supabase.from('business_settings').update({ settings, version: version + 1, updated_at: new Date().toISOString(), updated_by: user.id }).eq('id', 1).eq('version', version).select('version').maybeSingle()
  if (error) return NextResponse.json({ error: 'Opslaan mislukt.' }, { status: 503 })
  if (!data) return NextResponse.json({ error: 'De instellingen zijn ondertussen gewijzigd. Herlaad de pagina.' }, { status: 409 })
  return NextResponse.json({ settings, version: data.version })
}
