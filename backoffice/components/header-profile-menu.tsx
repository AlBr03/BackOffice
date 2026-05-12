'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isOfficeLikeRole } from '@/lib/roles'

export function HeaderProfileMenu({ role }: { role?: string | null }) {
  const supabase = createClient()
  const pathname = usePathname()
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const shouldHide = pathname === '/login' || pathname?.startsWith('/bestelstatus/')

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      window.addEventListener('mousedown', onPointerDown)
    }

    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [isOpen])

  if (shouldHide) {
    return null
  }

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
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Profielmenu openen"
        style={{
          width: 46,
          height: 46,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.22)',
          background: 'rgba(255,255,255,0.12)',
          color: 'white',
          display: 'grid',
          placeItems: 'center',
          fontSize: 20,
          fontWeight: 800,
          padding: 0,
        }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8Z" />
          <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </svg>
      </button>

      {isOpen ? (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 12px)',
            right: 0,
            minWidth: 220,
            background: 'white',
            borderRadius: 18,
            padding: 10,
            border: '1px solid #d9e2f0',
            boxShadow: '0 18px 36px rgba(8,45,120,0.18)',
            zIndex: 20,
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 1.1,
              color: '#5b6b84',
            }}
          >
            PROFIEL
          </div>

          {isOfficeLikeRole(role) ? (
            <Link
              href="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'block',
                background: '#f8faff',
                color: '#164196',
                borderRadius: 12,
                padding: '12px 14px',
                textDecoration: 'none',
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Instellingen
            </Link>
          ) : null}

          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            style={{
              width: '100%',
              textAlign: 'left',
              background: '#f8faff',
              color: '#164196',
              borderRadius: 12,
              padding: '12px 14px',
            }}
          >
            {isLoggingOut ? 'Uitloggen...' : 'Uitloggen'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
