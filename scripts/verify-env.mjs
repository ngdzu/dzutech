#!/usr/bin/env node

const runEnv = process.env.NODE_ENV ?? 'development'
const isCI = process.env.CI === 'true'
const forceCheck = process.env.FORCE_ENV_CHECK === 'true'

if (!isCI && runEnv !== 'production' && !forceCheck) {
  console.log('[verify-env] Skipping strict checks (set NODE_ENV=production or CI=true).')
  process.exit(0)
}

const lowerTrim = (value) => value?.toLowerCase().trim()
const isPlaceholder = (value) => {
  if (!value) return true
  const normalized = value.trim().toLowerCase()
  return (
    normalized.length === 0 ||
    ['changeme', 'please-change-me', 'please-change-me-with-at-least-32-characters', 'placeholder', 'example@example.com'].includes(
      normalized,
    )
  )
}

const requiredEnv = [
  {
    name: 'DATABASE_URL',
    validate: (value) => {
      if (isPlaceholder(value)) return 'DATABASE_URL must be a non-empty, production-ready connection string.'
      if (/postgres:\/\/postgres:postgres@/i.test(value)) {
        return 'DATABASE_URL uses the default postgres credentials. Provide unique production credentials.'
      }
      return null
    },
  },
  {
    name: 'SESSION_SECRET',
    validate: (value) => {
      if (isPlaceholder(value)) return 'SESSION_SECRET must be set to a secret value.'
      if (!value || value.length < 32) {
        return 'SESSION_SECRET must be at least 32 characters.'
      }
      return null
    },
  },
  {
    name: 'ALLOWED_ORIGIN',
    validate: (value) => {
      if (isPlaceholder(value)) return 'ALLOWED_ORIGIN must list one or more allowed domains.'
      if (value === '*') return 'ALLOWED_ORIGIN cannot be a wildcard in production.'
      return null
    },
  },
  {
    name: 'ADMIN_EMAIL',
    validate: (value) => {
      if (isPlaceholder(value)) return 'ADMIN_EMAIL must be set to the administrator email address.'
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value ?? '')) {
        return 'ADMIN_EMAIL must be a valid email address.'
      }
      return null
    },
  },
  {
    name: 'ADMIN_PASSWORD_HASH',
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return 'ADMIN_PASSWORD_HASH must be populated with the bcrypt hash generated via npm run hash-password.'
      }
      if (value.startsWith('$2') === false) {
        return 'ADMIN_PASSWORD_HASH should look like a bcrypt hash (e.g., start with $2a$ or $2b$).'
      }
      return null
    },
  },
  {
    name: 'DB_SSL',
    validate: (value) => {
      if (lowerTrim(process.env.DATABASE_URL)?.includes('localhost') || lowerTrim(process.env.DATABASE_URL)?.includes('127.0.0.1')) {
        // Allow local database usage to disable SSL.
        return null
      }
      if (lowerTrim(value) !== 'true') {
        return 'DB_SSL should be set to true for remote/production databases.'
      }
      return null
    },
  },
]

const errors = []

for (const { name, validate } of requiredEnv) {
  const value = process.env[name]
  const failure = validate(value)
  if (failure) {
    errors.push(`${name}: ${failure}`)
  }
}

if (errors.length > 0) {
  console.error('\nEnvironment verification failed:')
  for (const error of errors) {
    console.error(`  • ${error}`)
  }
  console.error('\nSet the variables above (or provide proper GitHub secrets) before deploying.')
  process.exit(1)
}

console.log('[verify-env] Required environment variables are set.\n')
