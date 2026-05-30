'use client'

import { useState } from 'react'

export function DeleteOrderButton({
  orderId,
  orderNumber,
}: {
  orderId: string
  orderNumber: string
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    const confirmed = window.confirm(
      `Weet je zeker dat je order ${orderNumber} wilt verwijderen?\n\nDit kan niet ongedaan worden gemaakt.`
    )

    if (!confirmed) return

    setError(null)
    setIsDeleting(true)

    const response = await fetch(`/api/orders/${orderId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null
      setError(result?.error ?? 'Order kon niet worden verwijderd.')
      setIsDeleting(false)
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        style={{
          background: '#E30613',
          color: 'white',
        }}
      >
        {isDeleting ? 'Verwijderen...' : 'Order verwijderen'}
      </button>

      {error ? (
        <p style={{ margin: 0, color: '#b00012', fontWeight: 600 }}>{error}</p>
      ) : null}
    </div>
  )
}
