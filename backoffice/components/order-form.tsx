'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function OrderForm({ storeId }: { storeId?: string | null }) {
  const supabase = createClient()
  const [clubName, setClubName] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [hasPrint, setHasPrint] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const orderNumber = `ORD-${Date.now()}`

    const { error } = await supabase.from('orders').insert({
      order_number: orderNumber,
      store_id: storeId,
      club_name: clubName,
      product_description: productDescription,
      quantity,
      has_print: hasPrint,
      deadline: deadline || null,
      notes: notes || null,
    })

    if (error) {
      setError(error.message)
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: 'grid',
        gap: 12,
        maxWidth: 640,
        background: 'white',
        padding: 24,
        borderRadius: 12,
      }}
    >
      <h2>New order</h2>
      <input
        value={clubName}
        onChange={(e) => setClubName(e.target.value)}
        placeholder="Club name"
        required
      />
      <input
        value={productDescription}
        onChange={(e) => setProductDescription(e.target.value)}
        placeholder="Product description"
        required
      />
      <input
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        type="number"
        min={1}
        required
      />
      <label>
        <input
          checked={hasPrint}
          onChange={(e) => setHasPrint(e.target.checked)}
          type="checkbox"
        />{' '}
        Includes print work
      </label>
      <input value={deadline} onChange={(e) => setDeadline(e.target.value)} type="date" />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes"
        rows={5}
      />
      <button type="submit">Save order</button>
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
    </form>
  )
}