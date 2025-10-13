import { beforeEach, describe, it, expect, vi } from 'vitest'

// Hoisted, top-level mock that will be used by the dynamic imports inside the
// tests below. Defining these values at the top level allows the hoisted
// `vi.mock` factory to reference them and still be hoist-safe.
const constructed: Array<Record<string, unknown>> = []
const PoolMock = vi.fn((opts: unknown) => {
  constructed.push(opts as Record<string, unknown>)
  return { query: vi.fn(), on: vi.fn() }
})

vi.mock('pg', () => ({ Pool: PoolMock }))

describe('db module env branches', () => {
  beforeEach(() => {
    constructed.length = 0
    PoolMock.mockReset()
  })

  it('throws in production when DATABASE_URL is missing', async () => {
    vi.resetModules()
    // ensure no DATABASE_URL and NODE_ENV=production
    delete process.env.DATABASE_URL
    process.env.NODE_ENV = 'production'

    // dynamic import should throw because DATABASE_URL missing in production
    await expect(import('./db')).rejects.toThrow(/DATABASE_URL must be provided/)
  })

  it('uses DATABASE_URL when provided', async () => {
    vi.resetModules()
    process.env.NODE_ENV = 'development'
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/dbname'

  await import('./db')

  expect(PoolMock).toHaveBeenCalled()
  // ensure connectionString used matches DATABASE_URL
  const conn = (constructed[0]['connectionString'] ?? '') as string
  expect(conn).toContain('postgresql://user:pass')
  })

  it('enables ssl options when DB_SSL is true', async () => {
    vi.resetModules()
    process.env.NODE_ENV = 'development'
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/dbname'
    process.env.DB_SSL = 'true'
    process.env.DB_SSL_REJECT_UNAUTHORIZED = 'false'
    process.env.DB_SSL_CA = 'CERTLINE1\\nCERTLINE2'

  await import('./db')
  expect(constructed.length).toBeGreaterThan(0)
  const ssl = constructed[0]['ssl'] as Record<string, unknown> | undefined
  expect(ssl).toBeDefined()
  const rejectUnauthorized = ssl?.['rejectUnauthorized'] as boolean | undefined
  expect(rejectUnauthorized).toBe(false)
  const ca = (ssl?.['ca'] ?? '') as string
  expect(ca).toContain('CERTLINE1')
  })
})
