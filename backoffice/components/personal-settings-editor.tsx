'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConfiguredSelect } from '@/components/dropdown-provider'
import { defaultPersonalSettings, validatePersonalSettings, COLUMN_NAMES, SORT_NAMES, EVENT_NAMES, type PersonalSettings, type ColumnKey, type EventKey } from '@/lib/business-settings'

export function PersonalSettingsEditor({ initialSettings }: { initialSettings: PersonalSettings }) {
  const router = useRouter()
  const [settings, setSettings] = useState(initialSettings)
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  function change(update: (draft: PersonalSettings) => void) { setPreview(false); setMessage(null); setSettings((current) => { const draft = structuredClone(current); update(draft); return draft }) }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(null)
    try {
      const normalized = validatePersonalSettings(settings)
      if (!preview) { setPreview(true); return }
      setSaving(true)
      const response = await fetch('/api/settings/personal', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(normalized) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Opslaan mislukt.')
      setMessage('Persoonlijke voorkeuren opgeslagen.'); setPreview(false); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Opslaan mislukt.') }
    finally { setSaving(false) }
  }
  return <form onSubmit={submit} className="ui-stack">
    <section className="ui-card"><p className="ui-text-muted">Deze voorkeuren gelden alleen voor jouw account. Bedrijfsregels en ordertoegang blijven behouden.</p><button type="button" className="ui-subtle-button" disabled={saving} style={{ marginTop: 12 }} onClick={() => { setSettings(defaultPersonalSettings()); setPreview(false) }}>Mijn standaardvoorkeuren als concept herstellen</button></section>
    <fieldset disabled={saving} className="ui-card" style={{ display: 'grid', gap: 18, minWidth: 0 }}><legend>Dashboard en weergave</legend>
      <label className="ui-label">Kleurmodus<select value={settings.mode} onChange={(event) => change((draft) => { draft.mode = event.target.value as PersonalSettings['mode'] })}><option value="light">Licht</option><option value="dark">Donker</option></select></label>
      <div className="ui-grid-two">
        <label className="ui-label">Standaard artikelenfilter<ConfiguredSelect dropdown="article_status" value={settings.dashboard.articleStatus} onChange={(event) => change((draft) => { draft.dashboard.articleStatus = event.target.value })}><option value="">Alle artikelstatussen</option></ConfiguredSelect></label>
        <label className="ui-label">Standaard printfilter<ConfiguredSelect dropdown="print_status" value={settings.dashboard.printStatus} onChange={(event) => change((draft) => { draft.dashboard.printStatus = event.target.value })}><option value="">Alle printstatussen</option></ConfiguredSelect></label>
        <label className="ui-label">Print nodig<ConfiguredSelect dropdown="print_filter" value={settings.dashboard.print} onChange={(event) => change((draft) => { draft.dashboard.print = event.target.value as PersonalSettings['dashboard']['print'] })} /></label>
        <label className="ui-label">Sortering<select value={settings.dashboard.sort} onChange={(event) => change((draft) => { draft.dashboard.sort = event.target.value as PersonalSettings['dashboard']['sort'] })}>{Object.entries(SORT_NAMES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      </div>
      <strong>Zichtbare kolommen</strong><div className="ui-actions">{(Object.keys(COLUMN_NAMES) as ColumnKey[]).map((key) => <label key={key} style={{ display: 'inline-flex', gap: 8 }}><input style={{ width: 'auto' }} type="checkbox" checked={settings.dashboard.columns.includes(key)} disabled={key === 'order'} onChange={(event) => change((draft) => { draft.dashboard.columns = event.target.checked ? [...draft.dashboard.columns, key] : draft.dashboard.columns.filter((entry) => entry !== key) })} />{COLUMN_NAMES[key]}</label>)}</div>
    </fieldset>
    <fieldset disabled={saving} className="ui-card" style={{ display: 'grid', gap: 14 }}><legend>Mijn notificaties</legend>{(Object.keys(EVENT_NAMES) as EventKey[]).map((key) => <label key={key} style={{ display: 'inline-flex', gap: 8 }}><input style={{ width: 'auto' }} type="checkbox" checked={settings.notifications.includes(key)} onChange={(event) => change((draft) => { draft.notifications = event.target.checked ? [...draft.notifications, key] : draft.notifications.filter((entry) => entry !== key) })} />{EVENT_NAMES[key]}</label>)}</fieldset>
    {preview ? <section className="ui-card"><h2 className="ui-section-title">Voorbeeld van jouw dashboard</h2><p>{SORT_NAMES[settings.dashboard.sort]} · {settings.mode === 'dark' ? 'Donkere modus' : 'Lichte modus'}</p><div className="ui-scroll-x"><table className="ui-table"><thead><tr>{(Object.keys(COLUMN_NAMES) as ColumnKey[]).filter((key) => settings.dashboard.columns.includes(key)).map((key) => <th key={key}>{COLUMN_NAMES[key]}</th>)}</tr></thead><tbody><tr>{(Object.keys(COLUMN_NAMES) as ColumnKey[]).filter((key) => settings.dashboard.columns.includes(key)).map((key) => <td key={key}>{{ order: 'ORD-VOORBEELD', store: 'Voorbeeldwinkel', customer: 'Voorbeeldvereniging', product: 'Teamshirt', quantity: '10', print: 'Ja', status: 'Nieuw' }[key]}</td>)}</tr></tbody></table></div><p>{settings.notifications.length} notificatie-events geselecteerd.</p></section> : null}
    {error ? <div role="alert" className="ui-message ui-message-error">{error}</div> : null}{message ? <div role="status" className="ui-message ui-message-success">{message}</div> : null}
    <button type="submit" disabled={saving}>{saving ? 'Opslaan...' : preview ? 'Voorkeuren opslaan' : 'Voorbeeld bekijken'}</button>
  </form>
}
