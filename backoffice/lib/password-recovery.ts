export function passwordError(password: string, confirmation: string): string | null {
  if (password.length < 8) return 'Gebruik minimaal 8 tekens voor je nieuwe wachtwoord.'
  if (password !== confirmation) return 'De wachtwoorden komen niet overeen.'
  return null
}
