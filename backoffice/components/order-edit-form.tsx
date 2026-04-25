'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  createEmptyProductLine,
  getTotalQuantity,
  normalizeProductLines,
  parseProductDescription,
  serializeProductLines,
  type ProductLine,
} from '@/lib/order-fields'

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
  customer_email: string | null
  product_description: string
  print_instructions: string | null
  quantity: number
  has_print: boolean
  deadline: string | null
  delivery_date: string | null
  notes: string | null
  store_id: string
  order_items?: {
    product: string
    quantity: number
    product_code: string | null
  }[] | null
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
  const [customerEmail, setCustomerEmail] = useState(order.customer_email ?? '')
  const [acceptedBy, setAcceptedBy] = useState(order.accepted_by ?? '')
  const [wefactReference, setWefactReference] = useState(order.wefact_reference ?? '')
  const [logoAction, setLogoAction] = useState(order.logo_action ?? '')
  const [supplier, setSupplier] = useState(order.supplier ?? '')
  const [productLines, setProductLines] = useState<ProductLine[]>(
    order.order_items?.length
      ? order.order_items.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          productCode: item.product_code ?? '',
        }))
      : parseProductDescription(order.product_description, order.quantity)
  )
  const [printInstructions, setPrintInstructions] = useState(order.print_instructions ?? '')
  const [hasPrint, setHasPrint] = useState(order.has_print ?? false)
  const [deadline, setDeadline] = useState(order.deadline ?? '')
  const [deliveryDate, setDeliveryDate] = useState(order.delivery_date ?? '')
  const [notes, setNotes] = useState(order.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  function updateProductLine(
    index: number,
    field: 'product' | 'quantity' | 'productCode',
    value: string
  ) {
    setProductLines((currentLines) =>
      currentLines.map((line, lineIndex) => {
        if (lineIndex !== index) return line

        if (field === 'quantity') {
          const quantity = Number(value)
          return {
            ...line,
            quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
          }
        }

        return {
          ...line,
          [field]: value,
        }
      })
    )
  }

  function addProductLine() {
    setProductLines((currentLines) => [...currentLines, createEmptyProductLine()])
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSaving(true)

    if (!selectedStoreId) {
      setError('Selecteer een winkel.')
      setIsSaving(false)
      return
    }

    const normalizedProductLines = normalizeProductLines(productLines)
    const productDescription = serializeProductLines(normalizedProductLines)

    if (!productDescription) {
      setError('Vul minimaal een productregel in.')
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
        customer_email: customerEmail || null,
        product_description: productDescription,
        print_instructions: printInstructions || null,
        quantity: getTotalQuantity(normalizedProductLines),
        has_print: hasPrint,
        deadline: deadline || null,
        delivery_date: deliveryDate || null,
        notes: notes.trim() || null,
      })
      .eq('id', order.id)

    if (updateError) {
      setError(updateError.message)
      setIsSaving(false)
      return
    }

    const { error: deleteItemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', order.id)

    if (deleteItemsError) {
      setError(deleteItemsError.message)
      setIsSaving(false)
      return
    }

    const { error: insertItemsError } = await supabase.from('order_items').insert(
      normalizedProductLines.map((line) => ({
        order_id: order.id,
        product: line.product,
        quantity: line.quantity,
        product_code: line.productCode || null,
      }))
    )

    if (insertItemsError) {
      setError(insertItemsError.message)
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
        gap: 20,
        maxWidth: 960,
        background: 'white',
        padding: 28,
        borderRadius: 24,
        boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
        border: '1px solid #d9e2f0',
      }}
    >
      <div
        style={{
          display: 'grid',
          gap: 6,
          paddingBottom: 18,
          borderBottom: '1px solid #e6edf7',
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 1.1,
            color: '#E30613',
          }}
        >
          ORDERINVOER
        </div>
        <h2 style={{ margin: 0, color: '#082D78', fontSize: 34 }}>Order bewerken</h2>
        <p style={{ margin: 0, color: '#5b6b84' }}>
          Werk klantgegevens en productregels per bestelling overzichtelijk bij.
        </p>
      </div>

      <section
        style={{
          display: 'grid',
          gap: 14,
          padding: 20,
          borderRadius: 18,
          background: '#f8faff',
          border: '1px solid #e6edf7',
        }}
      >
        <h3 style={{ margin: 0, color: '#082D78', fontSize: 20 }}>Klantgegevens</h3>

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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <input
            value={clubName}
            onChange={(e) => setClubName(e.target.value)}
            placeholder="Naam klant / vereniging"
            required
          />
          <input
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="E-mailadres klant"
            type="email"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
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
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gap: 14,
          padding: 20,
          borderRadius: 18,
          background: '#f8faff',
          border: '1px solid #e6edf7',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h3 style={{ margin: 0, color: '#082D78', fontSize: 20 }}>Producten</h3>
            <p style={{ margin: '4px 0 0 0', color: '#5b6b84' }}>
              Iedere regel bevat product, aantal en productcode.
            </p>
          </div>

          <button
            type="button"
            onClick={addProductLine}
            style={{
              minWidth: 44,
              minHeight: 44,
              borderRadius: 999,
              fontSize: 24,
              lineHeight: 1,
              padding: 0,
            }}
            aria-label="Nieuwe productregel toevoegen"
            title="Nieuwe productregel toevoegen"
          >
            +
          </button>
        </div>

        {productLines.map((line, index) => (
          <div
            key={index}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 2fr) 130px minmax(0, 1.2fr)',
              gap: 12,
              padding: 16,
              borderRadius: 16,
              background: 'white',
              border: '1px solid #d9e2f0',
            }}
          >
            <input
              value={line.product}
              onChange={(e) => updateProductLine(index, 'product', e.target.value)}
              placeholder="Product"
              required
            />
            <input
              value={line.quantity}
              onChange={(e) => updateProductLine(index, 'quantity', e.target.value)}
              placeholder="Aantal"
              type="number"
              min={1}
              required
            />
            <input
              value={line.productCode}
              onChange={(e) => updateProductLine(index, 'productCode', e.target.value)}
              placeholder="Productcode"
            />
          </div>
        ))}
      </section>

      <section
        style={{
          display: 'grid',
          gap: 14,
          padding: 20,
          borderRadius: 18,
          background: '#f8faff',
          border: '1px solid #e6edf7',
        }}
      >
        <h3 style={{ margin: 0, color: '#082D78', fontSize: 20 }}>Orderdetails</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <select value={logoAction} onChange={(e) => setLogoAction(e.target.value)}>
            <option value="">Logo&apos;s / actie</option>
            <option value="bestellen">Bestellen</option>
            <option value="aanwezig">Aanwezig</option>
            <option value="niet_nodig">Niet nodig</option>
          </select>

          <input
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="Leverancier"
          />
        </div>

        <textarea
          value={printInstructions}
          onChange={(e) => setPrintInstructions(e.target.value)}
          placeholder="Printinstructies"
          rows={5}
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
      </section>

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
