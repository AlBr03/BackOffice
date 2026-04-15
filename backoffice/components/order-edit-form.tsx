'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type StoreOption = {
  id: string
  name: string
}

type OrderData = {
  id: string
  club_name: string
  accepted_by: string | null
  wefact_reference: string | null
  logo_action: string | null
  supplier: string | null
  product_description: string
  print_instructions: string | null
  quantity: number
  has_print: boolean
  deadline: string | null
  delivery_date: string | null
  notes: string | null
  store_id: string
}

export function OrderEditForm({
  role,
  stores,
  order,
}: {
  role?: string | null
  stores: StoreOption[]
  order: OrderData
}) {
  const supabase = createClient()
  const isStoreUser = role === 'store'

  const [selectedStoreId, setSelectedStoreId] = useState(order.store_id ?? '')
  const [clubName, setClubName] = useState(order.club_name ?? '')
  const [acceptedBy, setAcceptedBy] = useState(order.accepted_by ?? '')
  const [wefactReference, setWefactReference] = useState(order.wefact_reference ?? '')
  const [logoAction, setLogoAction] = useState(order.logo_action ?? '')
  const [supplier, setSupplier] = useState(order.supplier ?? '')
  const [productDescription, setProductDescription] = useState(order.product_description ?? '')
  const [printInstructions, setPrintInstructions] = useState(order.print_instructions ?? '')
  const [quantity, setQuantity] = useState(order.quantity ?? 1)
  const [hasPrint, setHasPrint] = useState(order.has_print ?? false)
  const [deadline, setDeadline] = useState(order.deadline ?? '')
  const [deliveryDate, setDeliveryDate] = useState(order.delivery_date ?? '')
  const [notes, setNotes] = useState(order.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSaving(true)

    if (!selectedStoreId) {
      setError('Selecteer een winkel.')
      setIsSaving(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        store_id: selectedStoreId,
        club_name: clubName,
        accepted_by: acceptedBy || null,
        wefact_reference: wefactReference || null,
        logo_action: logoAction || null,
        supplier: supplier || null,
        product_description: productDescription,
        print_instructions: printInstructions || null,
        quantity,
        has_print: hasPrint,
        deadline: deadline || null,
        delivery_date: deliveryDate || null,
        notes: notes || null,
      })
      .eq('id', order.id)

    if (updateError) {
      setError(updateError.message)
      setIsSaving(false)
      return
    }

    const { error: activityError } = await supabase.from('order_activity_log').insert({
      order_id: order.id,
      action_type: 'order_updated',
      description: 'Ordergegevens bijgewerkt',
      performed_by: user?.id ?? null,
    })

    if (activityError) {
      setError(activityError.message)
      setIsSaving(false)
      return
    }

    window.location.href = `/dashboard/orders/${order.id}`
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: 'grid',
        gap: 14,
        maxWidth: 860,
        background: 'white',
        padding: 24,
        borderRadius: 18,
        boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
        border: '1px solid #d9e2f0',
      }}
    >
      <h2 style={{ margin: 0, color: '#082D78', fontSize: 34 }}>Order bewerken</h2>

      {!isStoreUser ? (
        <div>
          <label style={{ display: 'block', marginBottom: 8, color: '#5b6b84', fontWeight: 600 }}>
            Winkel
          </label>
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            required
          >
            <option value="">Selecteer een winkel</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <input
        value={clubName}
        onChange={(e) => setClubName(e.target.value)}
        placeholder="Naam klant / vereniging"
        required
      />

      <input
        value={acceptedBy}
        onChange={(e) => setAcceptedBy(e.target.value)}
        placeholder="Aangenomen door medewerker"
      />

      <input
        value={wefactReference}
        onChange={(e) => setWefactReference(e.target.value)}
        placeholder="Wefact referentie"
      />

      <select value={logoAction} onChange={(e) => setLogoAction(e.target.value)}>
        <option value="">Logo's / actie</option>
        <option value="bestellen">Bestellen</option>
        <option value="aanwezig">Aanwezig</option>
        <option value="niet_nodig">Niet nodig</option>
      </select>

      <input
        value={supplier}
        onChange={(e) => setSupplier(e.target.value)}
        placeholder="Leverancier"
      />

      <input
        value={productDescription}
        onChange={(e) => setProductDescription(e.target.value)}
        placeholder="Artikelen / productomschrijving"
        required
      />

      <textarea
        value={printInstructions}
        onChange={(e) => setPrintInstructions(e.target.value)}
        placeholder="Printinstructies"
        rows={5}
      />

      <input
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        type="number"
        min={1}
        required
      />

      <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          checked={hasPrint}
          onChange={(e) => setHasPrint(e.target.checked)}
          type="checkbox"
          style={{ width: 18, height: 18 }}
        />
        Inclusief printwerk
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 8, color: '#5b6b84', fontWeight: 600 }}>
            Deadline
          </label>
          <input value={deadline} onChange={(e) => setDeadline(e.target.value)} type="date" />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 8, color: '#5b6b84', fontWeight: 600 }}>
            Datum uitlevering
          </label>
          <input
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            type="date"
          />
        </div>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Opmerkingen"
        rows={5}
      />

      <div style={{ display: 'flex', gap: 12 }}>
        <button type="submit" disabled={isSaving}>
          {isSaving ? 'Opslaan...' : 'Wijzigingen opslaan'}
        </button>

        <button
          type="button"
          onClick={() => {
            window.location.href = `/dashboard/orders/${order.id}`
          }}
          style={{
            background: '#eef3fb',
            color: '#164196',
          }}
        >
          Annuleren
        </button>
      </div>

      {error ? (
        <p style={{ color: '#b00012', margin: 0, fontWeight: 600 }}>{error}</p>
      ) : null}
    </form>
  )
}