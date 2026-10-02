'use client'
import { useBusinessSettings } from '@/components/business-provider'
export function StoreContactDetails({ storeId, storeName }: { storeId?: string | null; storeName?: string }) {
  const { business } = useBusinessSettings()
  const contact = business.stores[storeId ?? ''] ?? Object.values(business.stores).find((store) => store.name === storeName) ?? business.company
  if (![contact.email, contact.phone, contact.address, contact.openingHours].some(Boolean)) return null
  return <div className="ui-card-soft" style={{ display: 'grid', gap: 8 }}><strong>Contact · {contact.name}</strong>
    {contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : null}
    {contact.phone ? <span>{contact.phone}</span> : null}
    {contact.address ? <p className="ui-text-muted" style={{ whiteSpace: 'pre-wrap' }}>{contact.address}</p> : null}
    {contact.openingHours ? <div><strong>Openingstijden</strong><p className="ui-text-muted" style={{ whiteSpace: 'pre-wrap' }}>{contact.openingHours}</p></div> : null}
  </div>
}
