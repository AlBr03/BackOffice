'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      return
    }

    window.location.href = '/dashboard'
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
          maxWidth: 430,
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
          <h1 style={{ margin: 0, color: '#082D78' }}>Inloggen</h1>
          <p style={{ margin: '8px 0 0 0', color: '#5b6b84' }}>
            Log in op het backoffice dashboard
          </p>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mailadres"
            type="email"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Wachtwoord"
            type="password"
          />
          <button type="submit">Inloggen</button>
          {error ? <p style={{ color: '#b00012', margin: 0 }}>{error}</p> : null}
        </form>

        <div style={{ marginTop: 18, color: '#5b6b84' }}>
          Nog geen account? <Link href="/register">Account aanmaken</Link>
        </div>
      </div>
    </div>
  )
}
