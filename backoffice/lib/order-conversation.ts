export const CONVERSATION_STATUSES = { open: 'Open', answered: 'Beantwoord', closed: 'Gesloten' } as const
export const CONVERSATION_TEAMS = { store: 'Winkel', office: 'Hoofdkantoor', print: 'Printafdeling' } as const
export type ConversationMessage = { id: number; body: string; sender_kind: 'customer' | 'staff'; created_at: string }
export type ConversationThread = { status: keyof typeof CONVERSATION_STATUSES; assigned_user: string | null; team: keyof typeof CONVERSATION_TEAMS; revision: number; last_message_id: number; last_staff_message_id: number; customer_read_id: number }
export function canAccessConversation(profile: { role: string | null; store_id: string | null } | null, order: { store_id: string | null; has_print?: boolean | null }) {
  if (!profile) return false
  if (['admin','office','order_manager'].includes(profile.role ?? '')) return true
  if (profile.role === 'print') return !!order.has_print
  return ['store','store_manager'].includes(profile.role ?? '') && !!profile.store_id && profile.store_id === order.store_id
}
export function conversationText(value: unknown) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 4000) throw new Error('Vul een bericht in van maximaal 4000 tekens.')
  return value.trim()
}
export function conversationCursor(value: string | null) {
  if (value === null) return null
  if (!/^[0-9]+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error('Ongeldige berichtcursor.')
  return Number(value)
}

// Called only while the conversation is open. Hidden tabs have no polling timer.
export function watchConversation(refresh: () => void, page: Pick<Document,'visibilityState' | 'addEventListener' | 'removeEventListener'>, timers: { setInterval: (callback: () => void, ms: number) => number; clearInterval: (id: number) => void }) {
  let interval: number | null = null
  const visibility = () => {
    if (interval !== null) { timers.clearInterval(interval); interval = null }
    if (page.visibilityState === 'visible') {
      refresh()
      interval = timers.setInterval(refresh,30_000)
    }
  }
  page.addEventListener('visibilitychange',visibility)
  visibility()
  return () => { if (interval !== null) timers.clearInterval(interval); page.removeEventListener('visibilitychange',visibility) }
}
