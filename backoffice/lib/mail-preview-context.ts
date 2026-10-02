import 'server-only'
import { AsyncLocalStorage } from 'node:async_hooks'
import type { BusinessSettings } from '@/lib/business-settings'
export const mailPreviewContext = new AsyncLocalStorage<{ settings: BusinessSettings; capture: (message: { subject: string; text: string; html: string }) => void }>()
