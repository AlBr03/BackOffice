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
    <div className="ui-stack">
      <div>
        <h2 className="ui-section-title">Accounts beheren</h2>
        <p className="ui-text-muted" style={{ marginTop: 8 }}>
          Bekijk alle accounts en wijs rollen toe aan nieuwe gebruikers.
        </p>
      </div>

      {message ? <div className="ui-message ui-message-success">{message}</div> : null}
      {error ? <div className="ui-message ui-message-error">{error}</div> : null}

      <div className="ui-list">
        {accounts.map((account) => (
          <section key={account.id} className="ui-card">
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800, color: '#082D78' }}>
                  {account.full_name || 'Naam nog niet ingevuld'}
                </div>
                <div style={{ color: '#5b6b84' }}>{account.email}</div>
              </div>

              <div
                className="ui-row-card-grid"
                style={{ gridTemplateColumns: '1.2fr 1fr 1fr auto' }}
              >
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
