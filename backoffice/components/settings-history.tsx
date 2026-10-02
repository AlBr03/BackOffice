'use client'
import { useEffect, useState } from 'react'

type HistoryEntry = { id: number; version: number; changed_at: string; actorName?: string }
export function SettingsHistory({ category, version, onRestore, disabled = false }: { category: 'business' | 'dropdowns'; version: number; onRestore: (value: unknown) => void; disabled?: boolean }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/settings/history?type=${category}`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error); setEntries(result.history); setError(null) })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause.message ?? 'Historie kon niet worden geladen.') })
    return () => controller.abort()
  }, [category, version])
  async function restore(id: number, previous: boolean) {
    setBusy(true); setError(null)
    try {
      const response = await fetch(`/api/settings/history?type=${category}&id=${id}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || !result.history?.[0]) throw new Error(result.error ?? 'Versie niet gevonden.')
      const snapshot = previous ? result.history[0].previous_snapshot : result.history[0].snapshot
      onRestore(category === 'business' ? snapshot.settings : snapshot.options)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Herstellen mislukt.') }
    finally { setBusy(false) }
  }
  return <section className="ui-card" style={{ display: 'grid', gap: 12 }}>
    <h2 className="ui-section-title">Wijzigingshistorie</h2>
    <p className="ui-text-muted">Bekijk een eerdere versie als concept. Controleer het voorbeeld en sla op om deze opnieuw te gebruiken. De historie blijft behouden.</p>
    {error ? <div className="ui-message ui-message-error" role="alert">{error}</div> : null}
    {!entries.length && !error ? <p className="ui-text-muted">Nog geen wijzigingen opgeslagen.</p> : null}
    {entries.map((entry) => <div key={entry.id} className="ui-card-soft">
      <strong>Versie {entry.version}</strong> · {new Date(entry.changed_at).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })} · {entry.actorName ?? 'Gebruiker'}
      <div className="ui-actions" style={{ marginTop: 10 }}>
        <button type="button" className="ui-subtle-button" disabled={busy || disabled} onClick={() => restore(entry.id, false)}>Bekijk deze versie</button>
        <button type="button" className="ui-subtle-button" disabled={busy || disabled} onClick={() => restore(entry.id, true)}>Bekijk instellingen vóór deze wijziging</button>
      </div>
    </div>)}
  </section>
}
