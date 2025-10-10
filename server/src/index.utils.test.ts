import { describe, test, expect } from 'vitest'
import { validEmail, resolveCookieSecure, parseSameSite, normalizeEmail } from './index.utils'

describe('index utils', () => {
  test('validEmail matches basic emails', () => {
    expect(validEmail('a@b.com')).toBe(true)
    expect(validEmail('invalid')).toBe(false)
  })

  test('resolveCookieSecure parsing', () => {
    expect(resolveCookieSecure('true')).toBe(true)
    expect(resolveCookieSecure('false')).toBe(false)
    expect(resolveCookieSecure('auto')).toBe('auto')
    expect(resolveCookieSecure(undefined)).toBe('auto')
  })

  test('parseSameSite returns expected values', () => {
    expect(parseSameSite('strict', true)).toBe('strict')
    expect(parseSameSite(undefined, true)).toBe('strict')
    expect(parseSameSite(undefined, false)).toBe('lax')
  })

  test('normalizeEmail lowercases and trims', () => {
    expect(normalizeEmail('  Foo@ExAMPle.COM ')).toBe('foo@example.com')
  })
})
