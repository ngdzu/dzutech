export const validEmail = (email: string) => /.+@.+\..+/.test(email)

export const resolveCookieSecure = (raw?: string) => {
  const value = raw?.toLowerCase()
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'auto') return 'auto'
  return 'auto'
}

export const parseSameSite = (raw?: string, isProduction = false) => {
  const value = raw?.toLowerCase()
  if (value === 'strict' || value === 'lax' || value === 'none') return value
  return isProduction ? 'strict' : 'lax'
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase()
