'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function OrderDetailLiveShell({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    let hiddenAt: number | null = null

    function handleVisibilityChange() {
      if (document.hidden) {
        hiddenAt = Date.now()
        return
      }

      if (hiddenAt !== null && Date.now() - hiddenAt >= 30_000) {
        router.refresh()
      }

      hiddenAt = null
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [router])

  return <>{children}</>
}
