'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DROPDOWN_KEYS, DROPDOWN_DEFINITIONS, defaultDropdownSettings, mergeDropdownSettings, validateDropdownSettings, type DropdownKey, type DropdownOption, type DropdownSettings } from '@/lib/dropdown-settings'
import { SettingsHistory } from '@/components/settings-history'

export function DropdownManagement({ initialSettings, initialVersion }: { initialSettings: DropdownSettings; initialVersion: number }) {
  const router = useRouter()
  const [settings, setSettings] = useState(initialSettings)
  const [persisted, setPersisted] = useState(initialSettings)
  const [version, setVersion] = useState(initialVersion)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function update(key: DropdownKey, value: string, patch: Partial<DropdownOption>) {
    setPreview(false)
    setMessage(null)
    setSettings((current) => ({ ...current, [key]: current[key].map((option) => option.value === value ? { ...option, ...patch } : option) }))
  }

  function move(key: DropdownKey, index: number, offset: number) {
    setPreview(false)
    setMessage(null)
    setSettings((current) => {
      const options = [...current[key]]
      const next = index + offset
      if (next < 0 || next >= options.length) return current
      const moved = options[index]
      options[index] = options[next]
      options[next] = moved
      return { ...current, [key]: options }
    })
  }

  function add(key: DropdownKey) {
    setPreview(false)
    setMessage(null)
    const value = `custom_${crypto.randomUUID()}`
    setSettings((current) => ({ ...current, [key]: [...current[key], { value, label: '', enabled: true, customerLabel: '', customerDescription: '' }] }))
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      validateDropdownSettings(settings)
      if (!preview) { setPreview(true); return }
      const response = await fetch('/api/settings/dropdowns', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings, version }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Opslaan mislukt.')
      setSettings(result.settings)
      setPersisted(result.settings)
      setVersion(result.version)
      setPreview(false)
      setMessage('Keuzelijsten opgeslagen. De nieuwe opties zijn beschikbaar zodra een pagina wordt geopend of herladen.')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Opslaan mislukt.')
    } finally { setSaving(false) }
  }

  const defaults = defaultDropdownSettings()
  function restore(value: unknown) {
    const draft = mergeDropdownSettings(value)
    for (const key of DROPDOWN_KEYS) draft[key].push(...persisted[key].filter((option) => !draft[key].some((entry) => entry.value === option.value)).map((option) => ({ ...option, enabled: false })))
    setSettings(draft); setPreview(false); setError(null); setMessage('Concept hersteld. Bekijk het voorbeeld en sla op om dit toe te passen.')
  }
  return (
    <div className="ui-stack">
    <form onSubmit={save} className="ui-stack">
      <section className="ui-card" style={{ display: 'grid', gap: 12 }}>
        <p className="ui-text-muted">Bestaande orders behouden hun gegevens. Verborgen opties blijven zichtbaar wanneer ze al bij een order of account zijn gekozen. Verplichte opties blijven beschikbaar.</p>
        <p className="ui-text-muted">Statussen, rollen en bestelverantwoordelijkheden behouden hun bestaande werking. Nieuwe printvoorbeeldopties zijn vrije keuzes: ze starten geen automatische reminders of uploadverzoeken.</p>
        <Link href="/dashboard/settings/stores" className="ui-link-button">Winkels beheren</Link>
        <button type="button" className="ui-subtle-button" disabled={saving} onClick={() => restore(defaultDropdownSettings())}>Standaardkeuzelijsten als concept herstellen</button>
      </section>
      <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 20, minWidth: 0 }}>
        <legend className="ui-label">Dropdownopties</legend>
        {DROPDOWN_KEYS.map((key) => (
          <section key={key} className="ui-card" style={{ display: 'grid', gap: 16 }}>
            <h2 className="ui-section-title">{DROPDOWN_DEFINITIONS[key].title}</h2>
            {settings[key].map((option, index) => {
              const required = (DROPDOWN_DEFINITIONS[key].required as readonly string[]).includes(option.value)
              const isNew = !defaults[key].some((item) => item.value === option.value)
              const id = `dropdown-${key}-${option.value || 'all'}`
              return (
                <div key={option.value} className="ui-card-soft" style={{ display: 'grid', gap: 12 }}>
                  <label htmlFor={id} className="ui-label" style={{ marginBottom: 0 }}>Naam van optie {index + 1}</label>
                  <input id={id} value={option.label} required maxLength={100} onChange={(event) => update(key, option.value, { label: event.target.value })} />
                  {key === 'logo_action' ? <>
                    <label htmlFor={`${id}-customer`} className="ui-label">Naam op de klantpagina</label>
                    <input id={`${id}-customer`} value={option.customerLabel ?? ''} required maxLength={100} onChange={(event) => update(key, option.value, { customerLabel: event.target.value })} />
                    <label htmlFor={`${id}-description`} className="ui-label">Uitleg op de klantpagina</label>
                    <textarea id={`${id}-description`} value={option.customerDescription ?? ''} required maxLength={500} onChange={(event) => update(key, option.value, { customerDescription: event.target.value })} />
                  </> : null}
                  <div className="ui-actions" style={{ alignItems: 'center' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={option.enabled} disabled={required} style={{ width: 'auto' }} onChange={(event) => update(key, option.value, { enabled: event.target.checked })} />
                      {required ? 'Zichtbaar (verplicht)' : 'Zichtbaar'}
                    </label>
                    <button type="button" className="ui-subtle-button" aria-label={`${option.label || 'Optie'} omhoog verplaatsen`} disabled={index === 0} onClick={() => move(key, index, -1)}>Omhoog</button>
                    <button type="button" className="ui-subtle-button" aria-label={`${option.label || 'Optie'} omlaag verplaatsen`} disabled={index === settings[key].length - 1} onClick={() => move(key, index, 1)}>Omlaag</button>
                    {isNew && !persisted[key].some((item) => item.value === option.value) ? <button type="button" className="ui-subtle-button" onClick={() => { setPreview(false); setSettings((current) => ({ ...current, [key]: current[key].filter((item) => item.value !== option.value) })) }}>Nieuwe optie verwijderen</button> : null}
                  </div>
                </div>
              )
            })}
            {DROPDOWN_DEFINITIONS[key].custom ? <button type="button" className="ui-subtle-button" disabled={settings[key].length >= 100} onClick={() => add(key)}>Optie toevoegen</button> : null}
          </section>
        ))}
      </fieldset>
      {preview ? <section className="ui-card" style={{ display: 'grid', gap: 14 }}><h2 className="ui-section-title">Voorbeeld vóór opslaan</h2>{DROPDOWN_KEYS.map((key) => <label key={key} className="ui-label">{DROPDOWN_DEFINITIONS[key].title}<select defaultValue={settings[key].find((option) => option.enabled)?.value}>{settings[key].filter((option) => option.enabled).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>)}<p className="ui-text-muted">Verborgen opties blijven bij bestaande orders en accounts behouden.</p></section> : null}
      {error ? <div role="alert" className="ui-message ui-message-error">{error}</div> : null}
      {message ? <div role="status" className="ui-message ui-message-success">{message}</div> : null}
      <button type="submit" disabled={saving}>{saving ? 'Opslaan...' : preview ? 'Keuzelijsten opslaan' : 'Voorbeeld bekijken'}</button>
    </form>
    <SettingsHistory category="dropdowns" version={version} onRestore={restore} disabled={saving} />
    </div>
  )
}
