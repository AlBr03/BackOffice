export const ARTICLE_ORDER_RESPONSIBILITY_OPTIONS = [
  {
    value: 'order_manager',
    label: 'Bestelverantwoordelijke',
    shortLabel: 'Bestelverantwoordelijke',
    description: 'Artikelen moeten worden besteld door de bestelverantwoordelijke.',
  },
  {
    value: 'store_manager',
    label: 'Winkelverantwoordelijke',
    shortLabel: 'Winkel',
    description: 'Artikelen worden besteld door de winkelverantwoordelijke zelf.',
  },
  {
    value: 'not_needed',
    label: 'Niet bestellen',
    shortLabel: 'Niet nodig',
    description: 'Artikelen hoeven niet besteld te worden.',
  },
] as const

export type ArticleOrderResponsibility =
  (typeof ARTICLE_ORDER_RESPONSIBILITY_OPTIONS)[number]['value']

export function isArticleOrderResponsibility(value?: string | null): value is ArticleOrderResponsibility {
  return ARTICLE_ORDER_RESPONSIBILITY_OPTIONS.some((option) => option.value === value)
}

export function getArticleOrderResponsibility(value?: string | null) {
  return ARTICLE_ORDER_RESPONSIBILITY_OPTIONS.find((option) => option.value === value)
    ?? ARTICLE_ORDER_RESPONSIBILITY_OPTIONS[0]
}

export function getArticleOrderResponsibilityStyle(value?: string | null) {
  switch (value) {
    case 'store_manager':
      return {
        background: '#fff4de',
        color: '#7a4b00',
      }
    case 'not_needed':
      return {
        background: '#eef3fb',
        color: '#41516a',
      }
    default:
      return {
        background: '#e8f1ff',
        color: '#164196',
      }
  }
}
