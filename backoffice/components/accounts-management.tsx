'use client'

import { useEffect, useState } from 'react'

const ROLE_OPTIONS = [
  { value: 'pending', label: 'Nog niet toegewezen' },
  { value: 'store', label: 'Winkel' },
  { value: 'office', label: 'Hoofdkantoor' },
  { value: 'print', label: 'Printafdeling' },
  { value: 'admin', label: 'Beheerder' },
]

type Account = {
  id: string
  email: string
  created_at?: string | null
  full_name?: string | null
  role?: string | null
  store_id?: string | null
}

type Store = {
  id: string
  name: string
}

export function AccountsManagement() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/accounts')
      const result = (await response.json()) as {
        accounts?: Account[]
        stores?: Store[]
        error?: string
      }

      if (!response.ok) {
        setError(result.error ?? 'Accounts konden niet worden geladen.')
        return
      }

      setAccounts(result.accounts ?? [])
      setStores(result.stores ?? [])
    }

    load()
  }, [])

  function updateAccount(id: string, changes: Partial<Account>) {
    setAccounts((current) =>
      current.map((account) => (account.id === id ? { ...account, ...changes } : account))
    )
  }

  async function saveAccount(account: Account) {
    setMessage(null)
    setError(null)
    setSavingId(account.id)

    const response = await fetch(`/api/accounts/${account.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        full_name: account.full_name ?? '',
        role: account.role || 'pending',
        store_id: account.role === 'store' ? account.store_id || null : null,
      }),
    })

    const result = (await response.json()) as { error?: string }

    if (!response.ok) {
      setError(result.error ?? 'Account kon niet worden opgeslagen.')
      setSavingId(null)
      return
    }

    setMessage(`Account van ${account.email} is bijgewerkt.`)
    setSavingId(null)
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, color: '#082D78' }}>Accounts beheren</h1>
        <p style={{ margin: '8px 0 0 0', color: '#5b6b84' }}>
          Bekijk alle accounts en wijs rollen toe aan nieuwe gebruikers.
        </p>
      </div>

      {message ? <div style={{ color: '#167c3a', fontWeight: 600 }}>{message}</div> : null}
      {error ? <div style={{ color: '#b00012', fontWeight: 600 }}>{error}</div> : null}

      <div style={{ display: 'grid', gap: 16 }}>
        {accounts.map((account) => (
          <section
            key={account.id}
            style={{
              background: 'white',
              borderRadius: 18,
              padding: 20,
              border: '1px solid #d9e2f0',
              boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
            }}
          >
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800, color: '#082D78' }}>
                  {account.full_name || 'Naam nog niet ingevuld'}
                </div>
                <div style={{ color: '#5b6b84' }}>{account.email}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: 12 }}>
                <input
                  value={account.full_name ?? ''}
                  onChange={(e) => updateAccount(account.id, { full_name: e.target.value })}
                  placeholder="Volledige naam"
                />

                <select
                  value={account.role ?? ''}
                  onChange={(e) =>
                    updateAccount(account.id, {
                      role: e.target.value || 'pending',
                      store_id: e.target.value === 'store' ? account.store_id ?? '' : null,
                    })
                  }
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={account.store_id ?? ''}
                  onChange={(e) => updateAccount(account.id, { store_id: e.target.value || null })}
                  disabled={account.role !== 'store'}
                >
                  <option value="">Geen winkel</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => saveAccount(account)}
                  disabled={savingId === account.id}
                >
                  {savingId === account.id ? 'Opslaan...' : 'Opslaan'}
                </button>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
