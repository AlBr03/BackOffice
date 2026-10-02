'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useBusinessSettings } from '@/components/business-provider'

export function AppBrand() {
  const pathname = usePathname()
  const { business } = useBusinessSettings()
  const isPublicTrackingPage = pathname?.startsWith('/bestelstatus/')

  if (isPublicTrackingPage) {
    return <span className="app-brand">{business.company.name}</span>
  }

  return (
    <Link href="/dashboard" className="app-brand">
      {business.company.name} Backoffice
    </Link>
  )
}
