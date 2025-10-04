import { describe, expect, it } from 'vitest'
import { markdownToHtml } from './markdown.js'

describe('markdownToHtml', () => {
  it('renders markdown to sanitized html', () => {
    const html = markdownToHtml('# Hello <script>alert("oops")</script>')
  expect(html).toMatch(/<h1>hello\s*<\/h1>/i)
    expect(html).not.toContain('<script>')
  })

  it('returns an empty string for invalid input', () => {
    expect(markdownToHtml(undefined as unknown as string)).toBe('')
  })
})
