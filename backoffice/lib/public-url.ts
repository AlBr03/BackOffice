function withProtocol(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function normalizeBaseUrl(value?: string | null) {
  const trimmed = value?.trim()

  if (!trimmed) return null

  return withProtocol(trimmed).replace(/\/$/, '')
}

function isEphemeralVercelUrl(value: string) {
  try {
    const hostname = new URL(withProtocol(value)).hostname

    return hostname.endsWith('.vercel.app') && (
      hostname.includes('-git-') ||
      hostname.includes('-projects.vercel.app')
    )
  } catch {
    return false
  }
}

export function getPublicAppUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL
  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  const deploymentUrl = process.env.VERCEL_URL

  if (
    configuredUrl &&
    productionUrl &&
    isEphemeralVercelUrl(configuredUrl)
  ) {
    return normalizeBaseUrl(productionUrl)
  }

  return (
    normalizeBaseUrl(configuredUrl) ??
    normalizeBaseUrl(productionUrl) ??
    normalizeBaseUrl(deploymentUrl)
  )
}

export function getPublicOrderTrackingUrl(trackingToken?: string | null) {
  const baseUrl = getPublicAppUrl()

  if (!baseUrl || !trackingToken) {
    return null
  }

  return `${baseUrl}/bestelstatus/${trackingToken}`
}
