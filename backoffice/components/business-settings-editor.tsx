'use client'
import { useState, useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { SettingsHistory } from '@/components/settings-history'
import { ConfiguredSelect } from '@/components/dropdown-provider'
import { defaultBusinessSettings, mergeBusinessSettings, validateBusinessSettings, REMINDER_NAMES, EMAIL_NAMES, EVENT_NAMES, FIELD_NAMES, TRANSITIONS, RECIPIENTS, ROLES, TEMPLATE_VARIABLES, type BusinessSettings, type ContactDetails, type OrderDefaults, type EmailKey, type FieldKey } from '@/lib/business-settings'

function Field({ label, children }: { label: string; children: ReactNode }) { return <label style={{ display: 'grid', gap: 6 }}><span className="ui-label" style={{ margin: 0 }}>{label}</span>{children}</label> }
function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) { return <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={checked} disabled={disabled} style={{ width: 'auto' }} onChange={(event) => onChange(event.target.checked)} />{label}</label> }
const recipientNames: Record<string, string> = { responsible: 'Bestaande bestelverantwoordelijke', order_manager: 'Inkoop', store_manager: 'Hoofdverantwoordelijke van de orderwinkel', print: 'Printafdeling', office: 'Hoofdkantoor', admin: 'Beheerder', store: 'Winkel' }
const contactLabels = { name: 'Naam voor communicatie', email: 'E-mailadres', phone: 'Telefoon', address: 'Adres', openingHours: 'Openingstijden', signature: 'Mailhandtekening' }

function ContactEditor({ value, onChange }: { value: ContactDetails; onChange: (field: keyof ContactDetails, value: string) => void }) {
  return <div className="ui-grid-two">{(Object.keys(contactLabels) as (keyof ContactDetails)[]).map((key) => <Field key={key} label={contactLabels[key]}>{['address', 'openingHours', 'signature'].includes(key) ? <textarea value={value[key]} maxLength={key === 'signature' ? 2000 : key === 'openingHours' ? 1000 : 500} onChange={(event) => onChange(key, event.target.value)} /> : <input value={value[key]} required={key === 'name'} type={key === 'email' ? 'email' : 'text'} maxLength={key === 'email' ? 254 : key === 'phone' ? 50 : 100} onChange={(event) => onChange(key, event.target.value)} />}</Field>)}</div>
}
function DefaultsEditor({ value, settings, onChange }: { value: OrderDefaults; settings: BusinessSettings; onChange: (field: keyof OrderDefaults, value: string | number) => void }) {
  return <div className="ui-grid-two">
    {(['supplier', 'printSupplier'] as const).map((key) => <Field key={key} label={key === 'supplier' ? 'Standaard artikelleverancier' : 'Standaard printleverancier'}><select value={value[key]} onChange={(event) => onChange(key, event.target.value)}><option value="">Geen standaardleverancier</option>{settings.suppliers.filter((supplier) => supplier.active && (supplier.kind === 'both' || supplier.kind === (key === 'supplier' ? 'article' : 'print'))).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></Field>)}
    <Field label="Standaard bestellen door"><ConfiguredSelect dropdown="article_order_responsibility" value={value.responsibility} onChange={(event) => onChange('responsibility', event.target.value)} /></Field>
    <Field label="Standaard dagen vóór verwachte levering"><input type="number" min={0} max={365} value={value.reminderDays} onChange={(event) => onChange('reminderDays', Number(event.target.value))} /></Field>
  </div>
}

export function BusinessSettingsEditor({ initialSettings, initialVersion, stores }: { initialSettings: BusinessSettings; initialVersion: number; stores: { id: string; name: string }[] }) {
  const router = useRouter()
  const [settings, setSettings] = useState(initialSettings)
  const [persisted, setPersisted] = useState(initialSettings)
  const [version, setVersion] = useState(initialVersion)
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [mailEvent, setMailEvent] = useState<EmailKey>('created')
  const [emailPreview, setEmailPreview] = useState<{ subject: string; html: string; text: string } | null>(null)
  useEffect(() => {
    if (!preview) return
    const controller = new AbortController()
    fetch('/api/settings/business/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ settings, event: mailEvent }) })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error); if (!controller.signal.aborted) setEmailPreview(result.preview) })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause.message ?? 'Voorbeeld kon niet worden gemaakt.') })
    return () => controller.abort()
  }, [preview, settings, mailEvent])
  function change(update: (draft: BusinessSettings) => void) { setPreview(false); setMessage(null); setSettings((current) => { const draft = structuredClone(current); update(draft); return draft }) }
  function restore(value: unknown) {
    const draft = mergeBusinessSettings(value)
    draft.stores = Object.fromEntries(Object.entries(draft.stores).filter(([id]) => stores.some((store) => store.id === id)))
    draft.suppliers.push(...persisted.suppliers.filter((supplier) => !draft.suppliers.some((entry) => entry.id === supplier.id)).map((supplier) => ({ ...supplier, active: false })))
    setSettings(draft); setPreview(false); setMessage('Concept hersteld. Bekijk het voorbeeld en sla op om dit toe te passen.'); setError(null)
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(null)
    try {
      const normalized = validateBusinessSettings(settings)
      if (!preview) { setSettings(normalized); setEmailPreview(null); setPreview(true); return }
      setSaving(true)
      const response = await fetch('/api/settings/business', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: normalized, version }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Opslaan mislukt.')
      setSettings(result.settings); setPersisted(result.settings); setVersion(result.version); setPreview(false); setMessage('Bedrijfsinstellingen opgeslagen. Nieuwe orders en gebeurtenissen gebruiken deze instellingen.'); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Opslaan mislukt.') }
    finally { setSaving(false) }
  }
  return <div className="ui-stack">
    <form onSubmit={submit} noValidate className="ui-stack">
      <div className="ui-card"><p className="ui-text-muted">Wijzigingen gelden voor het hele bedrijf. Orderdefaults gelden voor nieuwe orders; opgeslagen orders blijven behouden. Reminders en notificaties gebruiken vanaf de volgende gebeurtenis de actuele regels.</p><button type="button" className="ui-subtle-button" disabled={saving} style={{ marginTop: 12 }} onClick={() => restore(defaultBusinessSettings())}>Standaardinstellingen als concept herstellen</button></div>
      <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'grid', gap: 20 }}>
        <legend className="ui-label">Bedrijfsinstellingen</legend>
        <details className="ui-card" open><summary className="ui-section-title">Bedrijf en winkels</summary><div style={{ display: 'grid', gap: 18, marginTop: 18 }}>
          <ContactEditor value={settings.company} onChange={(key, value) => change((draft) => { draft.company[key] = value })} />
          <Field label="Merkkleur voor klantmails"><input type="color" value={settings.company.brandColor} onChange={(event) => change((draft) => { draft.company.brandColor = event.target.value })} /></Field>
          {stores.map((store) => <details key={store.id} className="ui-card-soft"><summary>{store.name}</summary><div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            {!settings.stores[store.id] ? <button type="button" className="ui-subtle-button" onClick={() => change((draft) => { draft.stores[store.id] = { name: store.name, email: '', phone: '', address: '', openingHours: '', signature: '', defaults: null } })}>Winkeldetails instellen</button> : <>
              <ContactEditor value={settings.stores[store.id]} onChange={(key, value) => change((draft) => { draft.stores[store.id][key] = value })} />
              <Toggle label="Eigen orderdefaults voor deze winkel" checked={settings.stores[store.id].defaults !== null} onChange={(checked) => change((draft) => { draft.stores[store.id].defaults = checked ? { ...draft.defaults } : null })} />
              {settings.stores[store.id].defaults ? <DefaultsEditor value={settings.stores[store.id].defaults!} settings={settings} onChange={(key, value) => change((draft) => { Object.assign(draft.stores[store.id].defaults!, { [key]: value }) })} /> : null}
            </>}
          </div></details>)}
        </div></details>
        <details className="ui-card"><summary className="ui-section-title">Leveranciers</summary><div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
          {settings.suppliers.map((supplier) => <div key={supplier.id} className="ui-card-soft" style={{ display: 'grid', gap: 12 }}><div className="ui-grid-two">
            <Field label="Leveranciersnaam"><input required maxLength={100} value={supplier.name} onChange={(event) => change((draft) => { draft.suppliers.find((entry) => entry.id === supplier.id)!.name = event.target.value })} /></Field>
            <Field label="Type"><select value={supplier.kind} onChange={(event) => change((draft) => { draft.suppliers.find((entry) => entry.id === supplier.id)!.kind = event.target.value as typeof supplier.kind })}><option value="article">Artikelen</option><option value="print">Print</option><option value="both">Artikelen en print</option></select></Field>
            <Field label="E-mailadres"><input type="email" value={supplier.email} onChange={(event) => change((draft) => { draft.suppliers.find((entry) => entry.id === supplier.id)!.email = event.target.value })} /></Field>
            <Field label="Telefoon"><input maxLength={50} value={supplier.phone} onChange={(event) => change((draft) => { draft.suppliers.find((entry) => entry.id === supplier.id)!.phone = event.target.value })} /></Field>
          </div><Toggle label="Actief" checked={supplier.active} onChange={(checked) => change((draft) => { draft.suppliers.find((entry) => entry.id === supplier.id)!.active = checked })} />
          {!persisted.suppliers.some((entry) => entry.id === supplier.id) ? <button type="button" className="ui-subtle-button" onClick={() => change((draft) => { draft.suppliers = draft.suppliers.filter((entry) => entry.id !== supplier.id) })}>Nieuwe leverancier verwijderen</button> : null}</div>)}
          <button type="button" className="ui-subtle-button" disabled={settings.suppliers.length >= 200} onClick={() => change((draft) => { draft.suppliers.push({ id: `supplier_${crypto.randomUUID()}`, name: '', kind: 'article', email: '', phone: '', active: true }) })}>Leverancier toevoegen</button>
        </div></details>
        <details className="ui-card"><summary className="ui-section-title">Orderdefaults</summary><div style={{ marginTop: 18 }}><DefaultsEditor value={settings.defaults} settings={settings} onChange={(key, value) => change((draft) => { Object.assign(draft.defaults, { [key]: value }) })} /></div></details>
        <details className="ui-card"><summary className="ui-section-title">Reminders</summary><p className="ui-text-muted" style={{ marginTop: 12 }}>Dagen na aanmaken/bestellen, of vóór de verwachte levering. Een ingevulde remindertermijn op een bestaande order blijft leidend voor levering.</p><div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
          {(Object.keys(REMINDER_NAMES) as (keyof typeof REMINDER_NAMES)[]).map((key) => <div key={key} className="ui-card-soft" style={{ display: 'grid', gap: 12 }}><strong>{REMINDER_NAMES[key]}</strong><Toggle label="Ingeschakeld" checked={settings.reminders[key].enabled} onChange={(checked) => change((draft) => { draft.reminders[key].enabled = checked })} /><Field label={key === 'article_delivery' ? 'Standaard dagen vóór levering (als de order geen eigen termijn heeft)' : 'Dagen na de gebeurtenis'}><input type="number" min={0} max={365} value={settings.reminders[key].days} onChange={(event) => change((draft) => { draft.reminders[key].days = Number(event.target.value) })} /></Field><div className="ui-actions">{RECIPIENTS.map((role) => <Toggle key={role} label={recipientNames[role]} checked={settings.reminders[key].recipients.includes(role)} onChange={(checked) => change((draft) => { draft.reminders[key].recipients = checked ? [...draft.reminders[key].recipients, role] : draft.reminders[key].recipients.filter((entry) => entry !== role) })} />)}</div></div>)}
        </div></details>
        <details className="ui-card"><summary className="ui-section-title">Mailtemplates</summary><p className="ui-text-muted" style={{ marginTop: 12 }}>Lege velden behouden de bestaande tekst. Een aangepaste berichttekst vervangt de toelichting; ordergegevens en de bestellink worden toegevoegd. Tekst wordt veilig weergegeven.</p><p className="ui-text-muted">Beschikbare placeholders: {TEMPLATE_VARIABLES.map((variable) => `{{${variable}}}`).join(', ')}</p><div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
          {(Object.keys(EMAIL_NAMES) as EmailKey[]).map((key) => <details key={key} className="ui-card-soft"><summary>{EMAIL_NAMES[key]}</summary><div style={{ display: 'grid', gap: 12, marginTop: 12 }}><Toggle label="Mail inschakelen" checked={settings.emails[key].enabled} onChange={(checked) => change((draft) => { draft.emails[key].enabled = checked })} /><Field label="Onderwerp (leeg = standaard)"><input maxLength={200} value={settings.emails[key].subject} onChange={(event) => change((draft) => { draft.emails[key].subject = event.target.value })} /></Field><Field label="Berichttekst (leeg = standaard)"><textarea maxLength={10000} value={settings.emails[key].body} onChange={(event) => change((draft) => { draft.emails[key].body = event.target.value })} /></Field></div></details>)}
        </div></details>
        <details className="ui-card"><summary className="ui-section-title">Verplichte ordervelden</summary><p className="ui-text-muted" style={{ marginTop: 12 }}>Winkel, klantnaam en productregels blijven verplicht. Printvelden zijn alleen verplicht bij printorders; verwachte artikellevering alleen bij artikelen die niet op voorraad zijn. Vul ontbrekende gegevens via Order bewerken voordat je de status wijzigt.</p><div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
          {(['create', ...TRANSITIONS] as const).map((key) => { const fields = key === 'create' ? settings.required.create : settings.required.transitions[key]; return <details key={key} className="ui-card-soft"><summary>{key === 'create' ? 'Bij nieuwe orders' : `Bij ${key.startsWith('article:') ? 'artikelenstatus' : 'printstatus'}: ${({ new: 'Nieuw', ordered: 'Besteld', at_location: 'Op locatie', completed: 'Afgerond', logos_ordered: 'Logo’s besteld', logos_at_location: 'Logo’s op locatie' } as Record<string,string>)[key.split(':')[1]]}`}</summary><div className="ui-actions" style={{ marginTop: 12 }}>{(Object.keys(FIELD_NAMES) as FieldKey[]).map((field) => <Toggle key={field} label={FIELD_NAMES[field]} checked={fields.includes(field)} onChange={(checked) => change((draft) => { const next = checked ? [...fields, field] : fields.filter((entry) => entry !== field); if (key === 'create') draft.required.create = next; else draft.required.transitions[key] = next })} />)}</div></details> })}
        </div></details>
        <details className="ui-card"><summary className="ui-section-title">Notificaties per rol</summary><p className="ui-text-muted" style={{ marginTop: 12 }}>Deze keuzes bepalen welke toegestane ordergebeurtenissen in het notificatiemenu verschijnen. Ze geven geen extra toegang tot orders. Medewerkers kunnen events ook persoonlijk uitschakelen.</p><div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
          {(Object.keys(EVENT_NAMES) as (keyof typeof EVENT_NAMES)[]).map((key) => <div key={key} className="ui-card-soft" style={{ display: 'grid', gap: 12 }}><strong>{EVENT_NAMES[key]}</strong><Toggle label="Event inschakelen" checked={settings.notifications[key].enabled} onChange={(checked) => change((draft) => { draft.notifications[key].enabled = checked })} /><div className="ui-actions">{ROLES.map((role) => <Toggle key={role} label={recipientNames[role]} checked={settings.notifications[key].roles.includes(role)} onChange={(checked) => change((draft) => { draft.notifications[key].roles = checked ? [...draft.notifications[key].roles, role] : draft.notifications[key].roles.filter((entry) => entry !== role) })} />)}</div></div>)}
        </div></details>
      </fieldset>
      {preview ? <section className="ui-card" style={{ display: 'grid', gap: 14 }}><h2 className="ui-section-title">Voorbeeld vóór opslaan</h2><p className="ui-text-muted">Controleer de ingevulde instellingen hierboven en dit mailvoorbeeld. Er is nog niets opgeslagen en er wordt geen mail verstuurd.</p><Field label="Mailvoorbeeld"><select value={mailEvent} onChange={(event) => { setEmailPreview(null); setError(null); setMailEvent(event.target.value as EmailKey) }}>{Object.entries(EMAIL_NAMES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field><strong>{emailPreview?.subject ?? 'Voorbeeld wordt geladen...'}</strong><iframe title="Voorbeeld klantmail" sandbox="" srcDoc={emailPreview?.html ?? '<p>Voorbeeld wordt geladen...</p>'} style={{ width: '100%', height: 340, border: '1px solid var(--border)', background: 'white' }} /><p>{settings.suppliers.filter((supplier) => supplier.active).length} actieve leveranciers · {Object.values(settings.reminders).filter((reminder) => reminder.enabled).length} actieve reminders · {settings.required.create.length} aanvullende verplichte velden bij nieuwe orders</p><button type="button" className="ui-subtle-button" onClick={() => setPreview(false)}>Verder bewerken</button></section> : null}
      {error ? <div className="ui-message ui-message-error" role="alert">{error}</div> : null}{message ? <div className="ui-message ui-message-success" role="status">{message}</div> : null}
      <button type="submit" disabled={saving || (preview && !emailPreview)}>{saving ? 'Opslaan...' : preview ? 'Gecontroleerde instellingen opslaan' : 'Voorbeeld bekijken'}</button>
    </form>
    <SettingsHistory category="business" version={version} onRestore={restore} disabled={saving} />
  </div>
}
