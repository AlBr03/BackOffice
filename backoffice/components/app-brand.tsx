'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function AppBrand() {
  const pathname = usePathname()
  const isPublicTrackingPage = pathname?.startsWith('/bestelstatus/')

  if (isPublicTrackingPage) {
    return <span className="app-brand">INTERSPORT</span>
  }

  return (
    <Link href="/dashboard" className="app-brand">
      INTERSPORT Backoffice
    </Link>
  )
}
