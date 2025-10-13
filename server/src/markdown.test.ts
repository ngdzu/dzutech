import { describe, it, expect } from 'vitest'
import { markdownToHtml } from './markdown'

describe('markdownToHtml', () => {
  it('converts markdown to sanitized HTML', () => {
    const md = '# Hello\n\nThis is **bold** and *italic*.'
    const html = markdownToHtml(md)
    expect(html).toContain('<h1')
    expect(html).toContain('Hello')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
  })

  it('returns empty string for non-string input', () => {
    // @ts-expect-error testing runtime behavior
    const html = markdownToHtml(null)
    expect(html).toBe('')
  })

  it('sanitizes dangerous HTML inside markdown', () => {
    const md = 'Normal text\n\n<script>alert("xss")</script>\n<a href="javascript:alert(1)">click</a>'
    const html = markdownToHtml(md)
    // script tags should be removed
    expect(html).not.toContain('<script>')
    // javascript: links should be sanitized/removed
    expect(html).not.toContain('javascript:alert')
    // normal text should remain
    expect(html).toContain('Normal text')
  })
})
