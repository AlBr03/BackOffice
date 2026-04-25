'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  createEmptyProductLine,
  getTotalQuantity,
  normalizeProductLines,
  serializeProductLines,
} from '@/lib/order-fields'
import { deriveLegacyStatus, getInitialPrintStatus } from '@/lib/order-status'

type StoreOption = {
  id: string
  name: string
}

export function OrderForm({
  role,
  storeId,
  stores,
}: {
  role?: string | null
  storeId?: string | null
  stores: StoreOption[]
}) {
  const supabase = createClient()

  const isStoreUser = role === 'store'

  const [selectedStoreId, setSelectedStoreId] = useState(storeId ?? '')
  const [clubName, setClubName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [acceptedBy, setAcceptedBy] = useState('')
  const [wefactQuoteReference, setWefactQuoteReference] = useState('')
  const [wefactQuoteUrl, setWefactQuoteUrl] = useState('')
  const [wefactInvoiceReference, setWefactInvoiceReference] = useState('')
  const [wefactInvoiceUrl, setWefactInvoiceUrl] = useState('')
  const [logoAction, setLogoAction] = useState('')
  const [supplier, setSupplier] = useState('')
  const [productLines, setProductLines] = useState([createEmptyProductLine()])
  const [printInstructions, setPrintInstructions] = useState('')
  const [hasPrint, setHasPrint] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

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

    if (!selectedStoreId) {
      setError('Selecteer een winkel.')
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const orderNumber = `ORD-${Date.now()}`
    const normalizedProductLines = normalizeProductLines(productLines)
    const productDescription = serializeProductLines(normalizedProductLines)

    if (!productDescription) {
      setError('Vul minimaal een productregel in.')
      return
    }

    const { data: insertedOrder, error: insertError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        store_id: selectedStoreId,
        club_name: clubName,
        accepted_by: acceptedBy || null,
        wefact_reference: wefactQuoteReference || null,
        wefact_quote_reference: wefactQuoteReference || null,
        wefact_quote_url: wefactQuoteUrl.trim() || null,
        wefact_invoice_reference: wefactInvoiceReference || null,
        wefact_invoice_url: wefactInvoiceUrl.trim() || null,
        logo_action: logoAction || null,
        supplier: supplier || null,
        customer_email: customerEmail || null,
        product_description: productDescription,
        print_instructions: printInstructions || null,
        quantity: getTotalQuantity(normalizedProductLines),
        has_print: hasPrint,
        article_status: 'new',
        print_status: getInitialPrintStatus(hasPrint),
        status: deriveLegacyStatus('new', hasPrint, getInitialPrintStatus(hasPrint)),
        deadline: deadline || null,
        delivery_date: deliveryDate || null,
        notes: notes.trim() || null,
      })
      .select('id')
      .single()

    if (insertError || !insertedOrder) {
      setError(insertError?.message ?? 'De order kon niet worden opgeslagen.')
      return
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
      normalizedProductLines.map((line) => ({
        order_id: insertedOrder.id,
        product: line.product,
        quantity: line.quantity,
        product_code: line.productCode || null,
      }))
    )

    if (itemsError) {
      setError(itemsError.message)
      return
    }

    const activityDescription = hasPrint
      ? 'Order aangemaakt met printwerk'
      : 'Order aangemaakt'

    const { error: activityError } = await supabase.from('order_activity_log').insert({
      order_id: insertedOrder.id,
      action_type: 'created',
      description: activityDescription,
      new_status: 'new',
      performed_by: user?.id ?? null,
    })

    if (activityError) {
      setError(activityError.message)
      return
    }

    try {
      await fetch(`/api/orders/${insertedOrder.id}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'created' }),
      })
    } catch (notificationError) {
      console.error('Ordermail kon niet worden verstuurd', notificationError)
    }

    window.location.href = '/dashboard'
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
        <h2 style={{ margin: 0, color: '#082D78', fontSize: 34 }}>Nieuwe order</h2>
        <p style={{ margin: 0, color: '#5b6b84' }}>
          Vul de klantgegevens in en voeg daarna een of meer productregels toe.
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
          <div />
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ color: '#5b6b84', fontWeight: 700, fontSize: 14 }}>Wefact offerte</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <input
              value={wefactQuoteReference}
              onChange={(e) => setWefactQuoteReference(e.target.value)}
              placeholder="Offerte referentie / nummer"
            />
            <input
              value={wefactQuoteUrl}
              onChange={(e) => setWefactQuoteUrl(e.target.value)}
              placeholder="Offerte link in Wefact"
              type="url"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ color: '#5b6b84', fontWeight: 700, fontSize: 14 }}>Wefact factuur</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <input
              value={wefactInvoiceReference}
              onChange={(e) => setWefactInvoiceReference(e.target.value)}
              placeholder="Factuur referentie / nummer"
            />
            <input
              value={wefactInvoiceUrl}
              onChange={(e) => setWefactInvoiceUrl(e.target.value)}
              placeholder="Factuurlink in Wefact"
              type="url"
            />
          </div>
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
              Voeg per regel het product, aantal en de productcode toe.
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

      <button type="submit">Order opslaan</button>

      {error ? (
        <p style={{ color: '#b00012', margin: 0, fontWeight: 600 }}>{error}</p>
      ) : null}
    </form>
  )
}
