export const STORE_MANAGER_ROLE = 'store_manager'
export const STORE_ROLE = 'store'

export function isStoreLikeRole(role?: string | null) {
  return role === STORE_ROLE || role === STORE_MANAGER_ROLE
}

export function isOfficeLikeRole(role?: string | null) {
  return role === 'office' || role === 'admin'
}

export function translateRole(role?: string | null) {
  switch (role) {
    case 'pending':
      return 'Nog niet toegewezen'
    case STORE_ROLE:
      return 'Winkel'
    case STORE_MANAGER_ROLE:
      return 'Hoofdverantwoordelijke winkel'
    case 'office':
      return 'Hoofdkantoor'
    case 'print':
      return 'Printafdeling'
    case 'admin':
      return 'Beheerder'
    default:
      return 'Onbekend'
  }
}
