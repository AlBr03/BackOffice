'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

type NotificationItem = {
  id: string
  orderId: string
  orderNumber: string
  clubName: string
  storeName: string | null
  actionType: string | null
  description: string | null
  createdAt: string | null
  performerName: string
}

type NotificationsResponse = {
  lastSeenAt: string | null
  unreadCount: number
  notifications: NotificationItem[]
  error?: string
}

function formatDateTime(value: string | null) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getNotificationLabel(actionType: string | null) {
  switch (actionType) {
    case 'created':
      return 'Order aangemaakt'
    case 'order_updated':
      return 'Order bijgewerkt'
    case 'status_changed':
      return 'Status gewijzigd'
    case 'reminder_sent':
      return 'Reminder verstuurd'
    case 'customer_logo_uploaded':
      return 'Logo aangeleverd'
    case 'print_proof_ready':
      return 'Printvoorbeeld klaar'
    case 'print_proof_approved':
      return 'Printvoorbeeld goedgekeurd'
    case 'print_proof_rejected':
      return 'Printvoorbeeld afgewezen'
    default:
      return 'Wijziging'
  }
}

export function NotificationsMenu() {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  async function loadNotifications() {
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' })
      const result = (await response.json().catch(() => null)) as NotificationsResponse | null

      if (!response.ok) {
        setError(result?.error ?? 'Notificaties konden niet worden geladen.')
        return
      }

      setUnreadCount(result?.unreadCount ?? 0)
      setNotifications(result?.notifications ?? [])
    } catch {
      setError('Notificaties konden niet worden geladen.')
    } finally {
      setIsLoading(false)
    }
  }

  async function markAsSeen() {
    const seenAt = new Date().toISOString()

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lastSeenAt: seenAt }),
      })

      if (response.ok) {
        setUnreadCount(0)
      }
    } catch {
      // The next successful open or refresh can mark these notifications as seen.
    }
  }

  useEffect(() => {
    loadNotifications()

    const interval = window.setInterval(loadNotifications, 60_000)
    return () => window.clearInterval(interval)
  }, [])

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

  async function onToggle() {
    const nextIsOpen = !isOpen
    setIsOpen(nextIsOpen)

    if (nextIsOpen) {
      await loadNotifications()
      await markAsSeen()
    }
  }

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-label="Notificaties openen"
        title="Notificaties"
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
          position: 'relative',
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
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>

        {unreadCount > 0 ? (
          <span
            aria-label={`${unreadCount} nieuwe notificaties`}
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              minWidth: 20,
              height: 20,
              padding: '0 6px',
              borderRadius: 999,
              background: '#e30613',
              color: 'white',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 900,
              border: '2px solid rgba(255,255,255,0.95)',
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 12px)',
            right: 0,
            width: 'min(420px, calc(100vw - 24px))',
            maxHeight: 'min(620px, calc(100vh - 110px))',
            background: 'var(--popover-background)',
            borderRadius: 18,
            border: '1px solid var(--border)',
            boxShadow: '0 18px 36px rgba(8,45,120,0.18)',
            zIndex: 30,
            overflow: 'hidden',
            color: 'var(--text)',
          }}
        >
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 1.1,
                color: 'var(--text-soft)',
              }}
            >
              NOTIFICATIES
            </div>
            <div style={{ marginTop: 4, fontWeight: 800 }}>
              Wijzigingen sinds je laatste bezoek
            </div>
          </div>

          <div style={{ maxHeight: 500, overflowY: 'auto', padding: 10 }}>
            {isLoading ? (
              <div style={{ padding: 14, color: 'var(--text-soft)', fontWeight: 700 }}>Laden...</div>
            ) : error ? (
              <div style={{ padding: 14, color: 'var(--error-text)', fontWeight: 700 }}>{error}</div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 14, color: 'var(--text-soft)', fontWeight: 700 }}>
                Geen nieuwe wijzigingen.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={`/dashboard/orders/${notification.orderId}`}
                    onClick={() => setIsOpen(false)}
                    style={{
                      display: 'grid',
                      gap: 6,
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'var(--surface-alt)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      textDecoration: 'none',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 10,
                        alignItems: 'baseline',
                      }}
                    >
                      <strong style={{ color: 'var(--link-color)' }}>
                        {getNotificationLabel(notification.actionType)}
                      </strong>
                      <span style={{ color: 'var(--text-soft)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {formatDateTime(notification.createdAt)}
                      </span>
                    </div>
                    <div style={{ fontWeight: 800 }}>
                      Order {notification.orderNumber} - {notification.clubName}
                    </div>
                    {notification.description ? (
                      <div style={{ color: 'var(--text-soft)', lineHeight: 1.45 }}>
                        {notification.description}
                      </div>
                    ) : null}
                    <div style={{ color: 'var(--text-soft)', fontSize: 13 }}>
                      Door {notification.performerName}
                      {notification.storeName ? ` - ${notification.storeName}` : ''}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
