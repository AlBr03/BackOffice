'use client'

import { useEffect, useState } from 'react'

type Store = {
  id: string
  name: string
}

export function StoresManagement() {
  const [stores, setStores] = useState<Store[]>([])
  const [newStoreName, setNewStoreName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/settings/stores')
      const result = (await response.json()) as {
        stores?: Store[]
        error?: string
      }

      if (!response.ok) {
        setError(result.error ?? 'Winkels konden niet worden geladen.')
        return
      }

      setStores(result.stores ?? [])
    }

    load()
  }, [])

  function updateStore(id: string, name: string) {
    setStores((current) =>
      current.map((store) => (store.id === id ? { ...store, name } : store))
    )
  }

  async function createStore() {
    const trimmedName = newStoreName.trim()

    if (!trimmedName) {
      setError('Vul eerst een winkelnaam in.')
      return
    }

    setMessage(null)
    setError(null)
    setIsCreating(true)

    const response = await fetch('/api/settings/stores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: trimmedName }),
    })

    const result = (await response.json()) as {
      store?: Store
      error?: string
    }

    if (!response.ok || !result.store) {
      setError(result.error ?? 'Winkel kon niet worden toegevoegd.')
      setIsCreating(false)
      return
    }

    setStores((current) => [...current, result.store].sort((a, b) => a.name.localeCompare(b.name)))
    setNewStoreName('')
    setMessage(`Winkel ${result.store.name} is toegevoegd.`)
    setIsCreating(false)
  }

  async function saveStore(store: Store) {
    const trimmedName = store.name.trim()

    if (!trimmedName) {
      setError('Een winkelnaam mag niet leeg zijn.')
      return
    }

    setMessage(null)
    setError(null)
    setSavingId(store.id)

    const response = await fetch(`/api/settings/stores/${store.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: trimmedName }),
    })

    const result = (await response.json()) as { error?: string }

    if (!response.ok) {
      setError(result.error ?? 'Winkel kon niet worden opgeslagen.')
      setSavingId(null)
      return
    }

    setStores((current) =>
      [...current.map((item) => (item.id === store.id ? { ...item, name: trimmedName } : item))].sort(
        (a, b) => a.name.localeCompare(b.name)
      )
    )
    setMessage(`Winkel ${trimmedName} is bijgewerkt.`)
    setSavingId(null)
  }

  async function deleteStore(store: Store) {
    if (!window.confirm(`Weet je zeker dat je ${store.name} wilt verwijderen?`)) {
      return
    }

    setMessage(null)
    setError(null)
    setDeletingId(store.id)

    const response = await fetch(`/api/settings/stores/${store.id}`, {
      method: 'DELETE',
    })

    const result = (await response.json()) as { error?: string }

    if (!response.ok) {
      setError(result.error ?? 'Winkel kon niet worden verwijderd.')
      setDeletingId(null)
      return
    }

    setStores((current) => current.filter((item) => item.id !== store.id))
    setMessage(`Winkel ${store.name} is verwijderd.`)
    setDeletingId(null)
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section
        style={{
          background: 'white',
          borderRadius: 18,
          padding: 24,
          border: '1px solid #d9e2f0',
          boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
          display: 'grid',
          gap: 14,
        }}
      >
        <h2 style={{ margin: 0, color: '#082D78' }}>Nieuwe winkel</h2>
        <p style={{ margin: 0, color: '#5b6b84' }}>
          Voeg winkels toe zodat accounts en orders aan de juiste locatie gekoppeld kunnen worden.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12 }}>
          <input
            value={newStoreName}
            onChange={(e) => setNewStoreName(e.target.value)}
            placeholder="Naam van de winkel"
          />
          <button type="button" onClick={createStore} disabled={isCreating}>
            {isCreating ? 'Toevoegen...' : 'Winkel toevoegen'}
          </button>
        </div>

        {message ? <div style={{ color: '#167c3a', fontWeight: 600 }}>{message}</div> : null}
        {error ? <div style={{ color: '#b00012', fontWeight: 600 }}>{error}</div> : null}
      </section>

      <section
        style={{
          background: 'white',
          borderRadius: 18,
          padding: 24,
          border: '1px solid #d9e2f0',
          boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
          display: 'grid',
          gap: 16,
        }}
      >
        <h2 style={{ margin: 0, color: '#082D78' }}>Bestaande winkels</h2>

        {stores.length === 0 ? (
          <div style={{ color: '#5b6b84' }}>Er zijn nog geen winkels toegevoegd.</div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {stores.map((store) => (
              <div
                key={store.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto auto',
                  gap: 12,
                  alignItems: 'center',
                  padding: 14,
                  borderRadius: 14,
                  background: '#f8faff',
                  border: '1px solid #e6edf7',
                }}
              >
                <input
                  value={store.name}
                  onChange={(e) => updateStore(store.id, e.target.value)}
                  placeholder="Winkelnaam"
                />

                <button
                  type="button"
                  onClick={() => saveStore(store)}
                  disabled={savingId === store.id}
                >
                  {savingId === store.id ? 'Opslaan...' : 'Opslaan'}
                </button>

                <button
                  type="button"
                  onClick={() => deleteStore(store)}
                  disabled={deletingId === store.id}
                  style={{
                    background: '#fff1f2',
                    color: '#b00012',
                  }}
                >
                  {deletingId === store.id ? 'Verwijderen...' : 'Verwijderen'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
