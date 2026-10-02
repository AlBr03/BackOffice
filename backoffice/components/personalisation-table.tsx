import type { Personalisation } from '@/lib/personalisation'

export function PersonalisationTable({ value, size, quantity }: { value?: Personalisation | null; size: string; quantity: number }) {
  if (!value || (!value.rows.length && !value.instructions)) return null
  return <section className="personalisation-summary">
    <h4>Personalisatie — maat {size || 'onbekend'} ({quantity} stuks)</h4>
    {value.instructions ? <p style={{ whiteSpace: 'pre-wrap' }}>{value.instructions}</p> : null}
    {value.rows.length ? <div className="personalisation-scroll"><table className="personalisation-table"><caption>Prints per artikel — totaal {value.rows.reduce((n, r) => n + r.quantity, 0)}</caption>
      <thead><tr>{['Maat', 'Aantal', 'Initialen', 'Rugnummer', 'Naam', 'Printnotities', ...value.columns.map(c => c.label)].map((label, i) => <th key={i}>{label}</th>)}</tr></thead>
      <tbody>{value.rows.map((r, i) => <tr key={i}>{[size || '—', String(r.quantity), r.initials, r.number, r.name, r.notes, ...value.columns.map(c => r.extra[c.id] ?? '')].map((cell, j) => <td key={j}>{cell || '—'}</td>)}</tr>)}</tbody>
    </table></div> : null}
  </section>
}
