import { describe, it, expect, vi } from 'vitest'

describe('markdownToHtml (mocked marked)', () => {
  it('handles non-string rendered value from marked.parse', async () => {
    // Reset modules so the following mock is applied at import time
    vi.resetModules()

    // Mock the `marked` module so parse returns a non-string (null).
    // The real module exports a named `marked` object, so mock should match that shape.
    vi.mock('marked', () => ({
      marked: {
        parse: () => null,
        // ensure setOptions exists since module code calls it
        setOptions: () => {},
      },
    }))

    const { markdownToHtml } = await import('./markdown')

    const result = markdownToHtml('# ignored')
    // When marked.parse returns non-string, markdownToHtml should sanitize '' and return ''
    expect(result).toBe('')
  })
})
