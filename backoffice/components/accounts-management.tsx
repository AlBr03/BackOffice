'use client'

import { useEffect, useState } from 'react'
import { isStoreLikeRole, ORDER_MANAGER_ROLE, STORE_MANAGER_ROLE, STORE_ROLE } from '@/lib/roles'

const ROLE_OPTIONS = [
  { value: 'pending', label: 'Nog niet toegewezen' },
  { value: STORE_ROLE, label: 'Winkel' },
  { value: STORE_MANAGER_ROLE, label: 'Hoofdverantwoordelijke winkel' },
  { value: 'office', label: 'Hoofdkantoor' },
  { value: ORDER_MANAGER_ROLE, label: 'Bestelverantwoordelijke' },
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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newAccount, setNewAccount] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'pending',
    store_id: '',
  })

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

  function updateNewAccount(changes: Partial<typeof newAccount>) {
    setNewAccount((current) => ({ ...current, ...changes }))
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setError(null)
    setIsCreating(true)

    const response = await fetch('/api/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...newAccount,
        store_id: isStoreLikeRole(newAccount.role) ? newAccount.store_id || null : null,
      }),
    })

    const result = (await response.json()) as { account?: Account; error?: string }

    if (!response.ok || !result.account) {
      setError(result.error ?? 'Account kon niet worden aangemaakt.')
      setIsCreating(false)
      return
    }

    setAccounts((current) => [result.account!, ...current])
    setMessage(`Account van ${result.account.email} is aangemaakt.`)
    setNewAccount({
      full_name: '',
      email: '',
      password: '',
      role: 'pending',
      store_id: '',
    })
    setIsCreating(false)
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
        store_id: isStoreLikeRole(account.role) ? account.store_id || null : null,
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

  async function deleteAccount(account: Account) {
    const confirmed = window.confirm(
      `Weet je zeker dat je het account van ${account.email} wilt verwijderen?\n\nDit kan niet ongedaan worden gemaakt.`
    )

    if (!confirmed) return

    setMessage(null)
    setError(null)
    setDeletingId(account.id)

    const response = await fetch(`/api/accounts/${account.id}`, {
      method: 'DELETE',
    })

    const result = (await response.json().catch(() => null)) as { error?: string } | null

    if (!response.ok) {
      setError(result?.error ?? 'Account kon niet worden verwijderd.')
      setDeletingId(null)
      return
    }

    setAccounts((current) => current.filter((item) => item.id !== account.id))
    setMessage(`Account van ${account.email} is verwijderd.`)
    setDeletingId(null)
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

      <form onSubmit={createAccount} className="ui-card" style={{ display: 'grid', gap: 12 }}>
        <div>
          <h3 className="ui-section-title">Nieuw account</h3>
          <p className="ui-text-muted" style={{ marginTop: 8 }}>
            Maak testgebruikers aan en wijs direct hun rol toe.
          </p>
        </div>

        <div
          className="ui-row-card-grid"
          style={{ gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr 1fr auto' }}
        >
          <input
            value={newAccount.full_name}
            onChange={(e) => updateNewAccount({ full_name: e.target.value })}
            placeholder="Volledige naam"
            required
          />
          <input
            value={newAccount.email}
            onChange={(e) => updateNewAccount({ email: e.target.value })}
            placeholder="E-mailadres"
            type="email"
            required
          />
          <input
            value={newAccount.password}
            onChange={(e) => updateNewAccount({ password: e.target.value })}
            placeholder="Tijdelijk wachtwoord"
            type="password"
            minLength={8}
            required
          />
          <select
            value={newAccount.role}
            onChange={(e) =>
              updateNewAccount({
                role: e.target.value || 'pending',
                store_id: isStoreLikeRole(e.target.value) ? newAccount.store_id : '',
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
            value={newAccount.store_id}
            onChange={(e) => updateNewAccount({ store_id: e.target.value })}
            disabled={!isStoreLikeRole(newAccount.role)}
          >
            <option value="">Geen winkel</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          <button type="submit" disabled={isCreating}>
            {isCreating ? 'Aanmaken...' : 'Aanmaken'}
          </button>
        </div>
      </form>

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
                style={{ gridTemplateColumns: '1.2fr 1fr 1fr auto auto' }}
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
                      store_id: isStoreLikeRole(e.target.value)
                        ? account.store_id ?? ''
                        : null,
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
                  disabled={!isStoreLikeRole(account.role)}
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
                  disabled={savingId === account.id || deletingId === account.id}
                >
                  {savingId === account.id ? 'Opslaan...' : 'Opslaan'}
                </button>

                <button
                  type="button"
                  onClick={() => deleteAccount(account)}
                  disabled={deletingId === account.id || savingId === account.id}
                  className="ui-subtle-button"
                  style={{ color: '#b00012', background: '#fff1f2' }}
                >
                  {deletingId === account.id ? 'Verwijderen...' : 'Verwijderen'}
                </button>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
