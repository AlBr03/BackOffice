type StatusOrder = { article_status: string | null; print_status: string | null; has_print?: boolean | null }
export function hasArrivalChange(previous: StatusOrder, next: StatusOrder) {
  return (previous.article_status !== next.article_status && next.article_status === 'at_location') ||
    (!!next.has_print && previous.print_status !== next.print_status && next.print_status === 'logos_at_location')
}
export function suppressCustomerArrivalEmail(next: StatusOrder, previous?: StatusOrder) {
  return previous ? hasArrivalChange(previous, next) : next.article_status === 'at_location' || (!!next.has_print && next.print_status === 'logos_at_location')
}
