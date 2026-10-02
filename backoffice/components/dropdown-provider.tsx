'use client'

import { createContext, useContext, type SelectHTMLAttributes, type ReactNode } from 'react'
import { defaultDropdownSettings, dropdownOptions, dropdownLabel, type DropdownKey, type DropdownSettings } from '@/lib/dropdown-settings'

const DropdownContext = createContext<DropdownSettings>(defaultDropdownSettings())
const ManagementContext = createContext(false)

export function DropdownProvider({ settings, canManage, children }: { settings: DropdownSettings; canManage: boolean; children: ReactNode }) {
  return <ManagementContext.Provider value={canManage}><DropdownContext.Provider value={settings}>{children}</DropdownContext.Provider></ManagementContext.Provider>
}

export function DropdownManagementAccess({ children }: { children: ReactNode }) {
  return useContext(ManagementContext) ? <>{children}</> : null
}

export function ConfiguredSelect({ dropdown, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { dropdown: DropdownKey }) {
  const settings = useContext(DropdownContext)
  const value = props.value ?? props.defaultValue
  const current = typeof value === 'string' ? value : undefined
  return (
    <select {...props}>
      {children}
      {dropdownOptions(settings, dropdown, current).map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  )
}

export function DropdownLabel({ dropdown, value }: { dropdown: DropdownKey; value?: string | null }) {
  return <>{dropdownLabel(useContext(DropdownContext), dropdown, value)}</>
}
