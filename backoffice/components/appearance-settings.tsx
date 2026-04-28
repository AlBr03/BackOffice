'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Mode = 'light' | 'dark'

const OPTIONS: { value: Mode; title: string; description: string }[] = [
  {
    value: 'light',
    title: 'Lichte modus',
    description: 'Frisse, heldere interface met de huidige standaardlook.',
  },
  {
    value: 'dark',
    title: 'Donkere modus',
    description: 'Rustiger voor de ogen bij langer gebruik of werken in de avond.',
  },
]

export function AppearanceSettings({ initialMode }: { initialMode: Mode }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function savePreference(nextMode: Mode) {
    setMode(nextMode)
    setMessage(null)
    setError(null)

    const response = await fetch('/api/settings/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode: nextMode }),
    })

    const result = (await response.json()) as { error?: string }

    if (!response.ok) {
      setError(result.error ?? 'Voorkeur kon niet worden opgeslagen.')
      return
    }

    setMessage(`Weergave aangepast naar ${nextMode === 'dark' ? 'donkere' : 'lichte'} modus.`)

    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <div className="ui-stack">
      <section className="ui-card" style={{ display: 'grid', gap: 16 }}>
        <div>
          <h2 className="ui-section-title">Kleurmodus</h2>
          <p className="ui-text-muted" style={{ marginTop: 8 }}>
            Kies hier welke interface je wilt gebruiken. De voorkeur wordt onthouden op dit
            apparaat.
          </p>
        </div>

        <div className="ui-list">
          {OPTIONS.map((option) => {
            const isSelected = mode === option.value

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => savePreference(option.value)}
                disabled={isPending}
                className="ui-card-soft"
                style={{
                  display: 'grid',
                  gap: 8,
                  textAlign: 'left',
                  color: isSelected ? 'white' : 'var(--text)',
                  background: isSelected ? 'var(--button-background)' : 'var(--surface-alt)',
                  border: isSelected ? 'none' : '1px solid rgba(125, 146, 182, 0.18)',
                  boxShadow: isSelected ? 'var(--button-shadow)' : 'none',
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800 }}>{option.title}</div>
                <div style={{ color: isSelected ? 'rgba(255,255,255,0.88)' : 'var(--text-soft)' }}>
                  {option.description}
                </div>
              </button>
            )
          })}
        </div>

        {message ? <div className="ui-message ui-message-success">{message}</div> : null}
        {error ? <div className="ui-message ui-message-error">{error}</div> : null}
      </section>
    </div>
  )
}
