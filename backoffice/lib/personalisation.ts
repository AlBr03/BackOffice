export type PrintRow = { quantity: number; initials: string; number: string; name: string; notes: string; extra: Record<string, string> }
export type Personalisation = { instructions: string; columns: { id: string; label: string }[]; rows: PrintRow[] }
export const emptyPersonalisation = (): Personalisation => ({ instructions: '', columns: [], rows: [] })
export const emptyPrintRow = (): PrintRow => ({ quantity: 1, initials: '', number: '', name: '', notes: '', extra: {} })

export function personalisationError(value: unknown, quantity: number): string | null {
  if (value == null) return null
  if (typeof value !== 'object' || Array.isArray(value)) return 'Ongeldige personalisatietabel.'
  const p = value as Personalisation
  if (typeof p.instructions !== 'string' || p.instructions.length > 4000 || !Array.isArray(p.columns) || p.columns.length > 12 || !Array.isArray(p.rows) || p.rows.length > 1000) return 'Maximaal 12 extra kolommen en 1000 regels; instructies maximaal 4000 tekens.'
  const ids = new Set<string>()
  for (const c of p.columns) {
    if (!c || typeof c.id !== 'string' || !/^field_[a-zA-Z0-9_-]+$/.test(c.id) || ids.has(c.id) || typeof c.label !== 'string' || !c.label.trim() || c.label.length > 80) return 'Geef elke extra kolom een unieke sleutel en een naam (maximaal 80 tekens).'
    ids.add(c.id)
  }
  for (const r of p.rows) {
    if (!r || !Number.isInteger(r.quantity) || r.quantity < 1 || r.quantity > 100000 || !r.extra || typeof r.extra !== 'object' || Array.isArray(r.extra)) return 'Elk aantal moet een positief geheel getal zijn.'
    if ([r.initials, r.number, r.name, r.notes, ...Object.values(r.extra)].some(v => typeof v !== 'string' || v.length > 1000)) return 'Celwaarden mogen maximaal 1000 tekens bevatten.'
    if (Object.keys(r.extra).some(id => !ids.has(id))) return 'Onbekende extra kolom.'
  }
  if (p.rows.length && p.rows.reduce((n, r) => n + r.quantity, 0) !== quantity) return `De personalisatieregels moeten samen ${quantity} artikelen bevatten, inclusief artikelen zonder persoonlijke print.`
  return null
}

// Tab-separated clipboard data from Excel: size, quantity, initials, number, name, notes, extra columns.
export function parsePrintPaste(text: string, size: string, columns: Personalisation['columns']): PrintRow[] {
  const lines = text.trimEnd().split(/\r?\n/).filter(l => l.trim())
  if (lines.length > 1000) throw new Error('Maximaal 1000 regels per artikel.')
  if (/^(maat|size)\t/i.test(lines[0] ?? '')) lines.shift()
  return lines.map((line, i) => {
    const cells = line.split('\t')
    if (cells.length < 2 || cells.length > 6 + columns.length) throw new Error(`Regel ${i + 1}: gebruik de aangegeven kolomvolgorde.`)
    if ((cells[0] ?? '').trim().toLowerCase() !== size.trim().toLowerCase()) throw new Error(`Regel ${i + 1}: maat moet ${size || '(leeg)'} zijn. Maak voor andere maten een aparte productregel.`)
    const quantity = Number(cells[1])
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error(`Regel ${i + 1}: ongeldig aantal.`)
    return { quantity, initials: cells[2] ?? '', number: cells[3] ?? '', name: cells[4] ?? '', notes: cells[5] ?? '', extra: Object.fromEntries(columns.map((c, j) => [c.id, cells[6 + j] ?? ''])) }
  })
}
