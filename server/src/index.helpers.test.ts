// Set environment variables before module imports
process.env.SESSION_SECRET = 'test-session-secret'
process.env.ADMIN_EMAIL = 'admin@test.com'
process.env.ADMIN_PASSWORD_HASH = '$2b$10$test.hash.for.admin.password'
process.env.SESSION_NAME = 'test-session'
process.env.SESSION_MAX_AGE_HOURS = '24'
process.env.NODE_ENV = 'test'
process.env.PORT = '3000'

import { describe, it, expect } from 'vitest'
import { resolveCookieSecure, parseSameSite, normalizeEmail, asyncHandler } from './index.js'

describe('index helpers', () => {
  it('normalizeEmail trims and lowercases', () => {
    expect(normalizeEmail('  EX@Example.COM  ')).toBe('ex@example.com')
  })

  it('resolveCookieSecure interprets values', () => {
    process.env.SESSION_COOKIE_SECURE = 'true'
    expect(resolveCookieSecure()).toBe(true)
    process.env.SESSION_COOKIE_SECURE = 'false'
    expect(resolveCookieSecure()).toBe(false)
    process.env.SESSION_COOKIE_SECURE = 'auto'
    expect(resolveCookieSecure()).toBe('auto')
    delete process.env.SESSION_COOKIE_SECURE
    expect(resolveCookieSecure()).toBe('auto')
  })

  it('parseSameSite returns provided or sensible default', () => {
    process.env.SESSION_COOKIE_SAMESITE = 'strict'
    expect(parseSameSite()).toBe('strict')
    process.env.SESSION_COOKIE_SAMESITE = 'none'
    expect(parseSameSite()).toBe('none')
    delete process.env.SESSION_COOKIE_SAMESITE
    // default when not production should be lax
    process.env.NODE_ENV = 'test'
    expect(parseSameSite()).toBe('lax')
    process.env.NODE_ENV = 'production'
    expect(parseSameSite()).toBe('strict')
  })

  it('asyncHandler forwards errors to next', async () => {
    const handler = asyncHandler(async () => {
      throw new Error('boom')
    })

    let called = false
    await new Promise<void>((resolve) => {
      // use minimal typing for the mock next
  // allow `any` here for minimal mock objects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler({} as any, {} as any, (err: unknown) => {
        called = true
        expect(err).toBeInstanceOf(Error)
        resolve()
      })
    })
    expect(called).toBe(true)
  })
})
