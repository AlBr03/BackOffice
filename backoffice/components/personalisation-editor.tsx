'use client'

import { useState } from 'react'
import { emptyPersonalisation, emptyPrintRow, parsePrintPaste, personalisationError, type Personalisation } from '@/lib/personalisation'

export function PersonalisationEditor({ value, size, quantity, onChange }: { value?: Personalisation | null; size: string; quantity: number; onChange: (value: Personalisation) => void }) {
  const p = value ?? emptyPersonalisation()
  const [paste, setPaste] = useState('')
  const [error, setError] = useState<string | null>(null)
  const problem = personalisationError(p, quantity)
  function cell(row: number, key: string, text: string, extra = false) {
    onChange({ ...p, rows: p.rows.map((r, i) => i !== row ? r : extra ? { ...r, extra: { ...r.extra, [key]: text } } : { ...r, [key]: key === 'quantity' ? Number(text) : text }) })
  }
  return <details className="personalisation-editor" open={p.rows.length > 0 || !!p.instructions || undefined}>
    <summary>Personalisatie toevoegen / bewerken — maat {size || 'onbekend'}</summary>
    <p>Eén regel per persoonlijk artikel; identieke prints mogen een gezamenlijk aantal hebben. Neem ook artikelen zonder persoonlijke print op. Extra kolommen zijn zichtbaar voor de klant.</p>
    <label>Gedeelde printinstructies<textarea value={p.instructions} maxLength={4000} onChange={e => onChange({ ...p, instructions: e.target.value })} /></label>
    <div className="personalisation-scroll"><table className="personalisation-table"><caption>Totaal {p.rows.reduce((n, r) => n + r.quantity, 0)} / {quantity} stuks</caption>
      <thead><tr><th>Maat</th><th>Aantal</th><th>Initialen</th><th>Rugnummer</th><th>Naam</th><th>Printnotities</th>{p.columns.map(c => <th key={c.id}><input aria-label="Kolomnaam" value={c.label} maxLength={80} onChange={e => onChange({ ...p, columns: p.columns.map(x => x.id === c.id ? { ...x, label: e.target.value } : x) })} /><button type="button" onClick={() => { if (!window.confirm(`Kolom ${c.label} en alle waarden verwijderen?`)) return; onChange({ ...p, columns: p.columns.filter(x => x.id !== c.id), rows: p.rows.map(r => ({ ...r, extra: Object.fromEntries(Object.entries(r.extra).filter(([id]) => id !== c.id)) })) }) }}>Kolom verwijderen</button></th>)}<th>Acties</th></tr></thead>
      <tbody>{p.rows.map((r, i) => <tr key={i}><td>{size || '—'}</td>{(['quantity', 'initials', 'number', 'name', 'notes'] as const).map(k => <td key={k}><input aria-label={`${k} regel ${i + 1}`} type={k === 'quantity' ? 'number' : 'text'} min={k === 'quantity' ? 1 : undefined} step={k === 'quantity' ? 1 : undefined} maxLength={1000} value={r[k]} onChange={e => cell(i, k, e.target.value)} /></td>)}{p.columns.map(c => <td key={c.id}><input aria-label={`${c.label} regel ${i + 1}`} maxLength={1000} value={r.extra[c.id] ?? ''} onChange={e => cell(i, c.id, e.target.value, true)} /></td>)}<td><button type="button" onClick={() => onChange({ ...p, rows: p.rows.filter((_, j) => j !== i) })}>Verwijder regel {i + 1}</button></td></tr>)}</tbody>
    </table></div>
    <div className="personalisation-actions"><button type="button" disabled={p.rows.length >= 1000} onClick={() => onChange({ ...p, rows: [...p.rows, emptyPrintRow()] })}>Regel toevoegen</button><button type="button" disabled={p.columns.length >= 12} onClick={() => onChange({ ...p, columns: [...p.columns, { id: `field_${crypto.randomUUID()}`, label: 'Extra informatie' }] })}>Extra kolom toevoegen</button></div>
    <details><summary>Plakken vanuit Excel</summary><p>Kolomvolgorde: Maat, Aantal, Initialen, Rugnummer, Naam, Printnotities{p.columns.length ? ', ' + p.columns.map(c => c.label).join(', ') : ''}. Alle regels moeten dezelfde maat als dit artikel hebben. Plakken voegt regels toe.</p><textarea aria-label="Excel-regels" value={paste} onChange={e => setPaste(e.target.value)} /><button type="button" onClick={() => { try { const rows = parsePrintPaste(paste, size, p.columns); if (p.rows.length + rows.length > 1000) throw new Error('Maximaal 1000 regels.'); onChange({ ...p, rows: [...p.rows, ...rows] }); setPaste(''); setError(null) } catch (e) { setError(e instanceof Error ? e.message : 'Ongeldige invoer') } }}>Regels toevoegen uit Excel</button></details>
    {error || problem ? <p role="alert" style={{ color: 'var(--error-text)' }}>{error || problem}</p> : null}
  </details>
}
