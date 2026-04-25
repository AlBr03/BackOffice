'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          email,
          password,
        }),
      })

      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        setError(result.error ?? 'Registreren is mislukt.')
        setIsSubmitting(false)
        return
      }

      setMessage('Account aangemaakt. Een hoofdkantooraccount kan nu de juiste rol toewijzen.')
      setFullName('')
      setEmail('')
      setPassword('')
    } catch {
      setError('Er ging iets mis tijdens het registreren.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 140px)',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'white',
          padding: 28,
          borderRadius: 18,
          boxShadow: '0 8px 28px rgba(8,45,120,0.10)',
          border: '1px solid #d9e2f0',
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 1.2,
              color: '#E30613',
              marginBottom: 8,
            }}
          >
            INTERSPORT
          </div>
          <h1 style={{ margin: 0, color: '#082D78' }}>Account aanmaken</h1>
          <p style={{ margin: '8px 0 0 0', color: '#5b6b84' }}>
            Maak een account aan. Daarna kan hoofdkantoor je rol toewijzen.
          </p>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Volledige naam"
            required
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mailadres"
            type="email"
            required
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Wachtwoord"
            type="password"
            minLength={8}
            required
          />

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Account aanmaken...' : 'Account aanmaken'}
          </button>

          {message ? <p style={{ color: '#167c3a', margin: 0, fontWeight: 600 }}>{message}</p> : null}
          {error ? <p style={{ color: '#b00012', margin: 0, fontWeight: 600 }}>{error}</p> : null}
        </form>

        <div style={{ marginTop: 18, color: '#5b6b84' }}>
          Heb je al een account? <Link href="/login">Ga naar inloggen</Link>
        </div>
      </div>
    </div>
  )
}
