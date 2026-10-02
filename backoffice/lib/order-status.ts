import type { DropdownSettings } from './dropdown-settings'

export const ARTICLE_STATUS_OPTIONS = [
  { value: 'new', label: 'Nieuw' },
  { value: 'ordered', label: 'Besteld' },
  { value: 'at_location', label: 'Op locatie' },
  { value: 'completed', label: 'Afgerond' },
] as const

export const PRINT_STATUS_OPTIONS = [
  { value: 'new', label: 'Nieuw' },
  { value: 'logos_ordered', label: "Logo's besteld" },
  { value: 'logos_at_location', label: "Logo's op locatie" },
  { value: 'completed', label: 'Afgerond' },
] as const

export type ArticleStatus = (typeof ARTICLE_STATUS_OPTIONS)[number]['value']
export type PrintStatus = (typeof PRINT_STATUS_OPTIONS)[number]['value']

export function translateArticleStatus(status?: string | null, settings?: DropdownSettings) {
  if (settings) return settings.article_status.find((option) => option.value === status)?.label ?? status ?? '-'
  return ARTICLE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status ?? '-'
}

export function translatePrintStatus(status?: string | null, settings?: DropdownSettings) {
  if (settings) return settings.print_status.find((option) => option.value === status)?.label ?? status ?? '-'
  if (!status) return '-'
  return PRINT_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
}

export function getArticleStatusStyle(status?: string | null) {
  switch (status) {
    case 'completed':
      return { background: 'var(--success-background)', color: 'var(--success-text)' }
    case 'at_location':
      return { background: 'var(--info-background)', color: 'var(--link-color)' }
    case 'ordered':
      return { background: 'var(--warning-background)', color: 'var(--warning-text)' }
    default:
      return { background: 'var(--surface-alt)', color: 'var(--text-soft)' }
  }
}

export function getPrintStatusStyle(status?: string | null) {
  switch (status) {
    case 'completed':
      return { background: 'var(--success-background)', color: 'var(--success-text)' }
    case 'logos_at_location':
      return { background: 'var(--info-background)', color: 'var(--link-color)' }
    case 'logos_ordered':
      return { background: 'var(--error-background)', color: 'var(--error-text)' }
    default:
      return { background: 'var(--surface-alt)', color: 'var(--text-soft)' }
  }
}

export function getInitialPrintStatus(hasPrint: boolean) {
  return hasPrint ? 'new' : null
}

export function deriveLegacyStatus(articleStatus: string, hasPrint: boolean, printStatus?: string | null) {
  if (articleStatus === 'completed' && (!hasPrint || printStatus === 'completed')) {
    return 'completed'
  }

  if (hasPrint && printStatus && printStatus !== 'new') {
    return 'waiting_print'
  }

  if (articleStatus === 'ordered' || articleStatus === 'at_location' || articleStatus === 'completed') {
    return 'in_progress'
  }

  return 'new'
}

export function backfillArticleStatus(status?: string | null) {
  switch (status) {
    case 'completed':
      return 'completed'
    case 'waiting_print':
      return 'at_location'
    case 'in_progress':
      return 'ordered'
    default:
      return 'new'
  }
}

export function backfillPrintStatus(status?: string | null, hasPrint?: boolean | null) {
  if (!hasPrint) return null

  switch (status) {
    case 'completed':
      return 'completed'
    case 'waiting_print':
      return 'logos_ordered'
    default:
      return 'new'
  }
}
