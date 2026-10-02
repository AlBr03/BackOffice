'use client'
import { useId } from 'react'
import { useBusinessSettings } from '@/components/business-provider'
export function SupplierField({ kind, value, onChange, required = false }: { kind: 'article' | 'print'; value: string; onChange: (value: string) => void; required?: boolean }) {
  const id = useId(), { business } = useBusinessSettings()
  return <><input list={id} value={value} onChange={(event) => onChange(event.target.value)} required={required} placeholder={kind === 'article' ? 'Leverancier' : "Leverancier logo's"} aria-label={kind === 'article' ? 'Artikelleverancier' : 'Printleverancier'} /><datalist id={id}>{business.suppliers.filter((supplier) => supplier.active && (supplier.kind === kind || supplier.kind === 'both')).map((supplier) => <option key={supplier.id} value={supplier.name} />)}</datalist></>
}
