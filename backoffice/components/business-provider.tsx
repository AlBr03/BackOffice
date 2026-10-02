'use client'
import { createContext, useContext, type ReactNode } from 'react'
import { defaultBusinessSettings, defaultPersonalSettings, type BusinessSettings, type PersonalSettings } from '@/lib/business-settings'

const BusinessContext = createContext({ business: defaultBusinessSettings(), personal: defaultPersonalSettings() })
export function BusinessProvider({ business, personal, children }: { business: BusinessSettings; personal: PersonalSettings; children: ReactNode }) {
  return <BusinessContext.Provider value={{ business, personal }}>{children}</BusinessContext.Provider>
}
export const useBusinessSettings = () => useContext(BusinessContext)
