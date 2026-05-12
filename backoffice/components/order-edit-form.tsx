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
import { deriveLegacyStatus, getInitialPrintStatus } from '@/lib/order-status'
import { isStoreLikeRole } from '@/lib/roles'

type StoreOption = {
  id: string
  name: string
}

type OrderData = {
  id: string
  club_name: string
  accepted_by: string | null
  wefact_reference: string | null
  wefact_quote_reference: string | null
  wefact_quote_url: string | null
  wefact_invoice_reference: string | null
  wefact_invoice_url: string | null
  logo_action: string | null
  supplier: string | null
  customer_email: string | null
  article_status: string | null
  print_status: string | null
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
  const isStoreUser = isStoreLikeRole(role)

  const [selectedStoreId, setSelectedStoreId] = useState(order.store_id ?? '')
  const [clubName, setClubName] = useState(order.club_name ?? '')
  const [customerEmail, setCustomerEmail] = useState(order.customer_email ?? '')
  const [acceptedBy, setAcceptedBy] = useState(order.accepted_by ?? '')
  const [wefactQuoteReference, setWefactQuoteReference] = useState(
    order.wefact_quote_reference ?? order.wefact_reference ?? ''
  )
  const [wefactQuoteUrl, setWefactQuoteUrl] = useState(order.wefact_quote_url ?? '')
  const [wefactInvoiceReference, setWefactInvoiceReference] = useState(
    order.wefact_invoice_reference ?? ''
  )
  const [wefactInvoiceUrl, setWefactInvoiceUrl] = useState(order.wefact_invoice_url ?? '')
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
        print_status: hasPrint ? order.print_status ?? getInitialPrintStatus(true) : null,
        status: deriveLegacyStatus(
          order.article_status ?? 'new',
          hasPrint,
          hasPrint ? order.print_status ?? getInitialPrintStatus(true) : null
        ),
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
    <form onSubmit={onSubmit} className="ui-card ui-form-shell">
      <div className="ui-form-header">
        <div className="ui-eyebrow">Orderinvoer</div>
        <h2 className="ui-title">Order bewerken</h2>
        <p className="ui-text-muted">
          Werk klantgegevens en productregels per bestelling overzichtelijk bij.
        </p>
      </div>

      <section className="ui-card-soft ui-form-section">
        <h3 className="ui-section-title">Klantgegevens</h3>

        {!isStoreUser ? (
          <div>
            <label className="ui-label">Winkel</label>
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

        <div className="ui-grid-two">
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

        <div className="ui-grid-two">
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

      <section className="ui-card-soft ui-form-section">
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
            <h3 className="ui-section-title">Producten</h3>
            <p className="ui-text-muted" style={{ marginTop: 4 }}>
              Iedere regel bevat product, aantal en productcode.
            </p>
          </div>

          <button
            type="button"
            onClick={addProductLine}
            className="ui-subtle-button"
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
          <div key={index} className="ui-product-row">
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
