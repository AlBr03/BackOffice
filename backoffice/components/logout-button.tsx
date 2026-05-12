'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const supabase = createClient()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function onLogout() {
    setIsLoggingOut(true)

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Uitloggen mislukt', error)
      setIsLoggingOut(false)
      return
    }

    window.location.href = '/login'
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={isLoggingOut}
      style={{
        background: '#eef3fb',
        color: '#164196',
      }}
    >
      {isLoggingOut ? 'Uitloggen...' : 'Uitloggen'}
    </button>
  )
}
