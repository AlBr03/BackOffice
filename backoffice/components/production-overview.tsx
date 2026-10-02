'use client'

import type { ProductLine } from '@/lib/order-fields'
import { PersonalisationTable } from './personalisation-table'

export function ProductionOverview({ number, customer, instructions, lines }: { number: string; customer: string; instructions: string | null; lines: ProductLine[] }) {
  return <section className="production-overview ui-card"><div className="personalisation-actions"><h2>Productieoverzicht — {number}</h2><button type="button" className="production-print-button" onClick={() => window.print()}>Productieoverzicht afdrukken</button></div><p>{customer}</p>{instructions ? <p style={{ whiteSpace: 'pre-wrap' }}>{instructions}</p> : null}{lines.map((line, i) => <article key={i}><h3>{line.productCode} {line.product} — {line.size || 'geen maat'} — {line.quantity} stuks</h3><PersonalisationTable value={line.personalisation} size={line.size} quantity={line.quantity} /></article>)}</section>
}
