import { describe, expect, it } from 'vitest'
import { markdownExcerpt, renderMarkdown } from './markdown'

const sampleMarkdown = `# Title\n\nParagraph with **bold** text.`

describe('markdown utilities', () => {
  it('sanitizes dangerous markup when rendering', () => {
    const html = renderMarkdown(`${sampleMarkdown}\n<script>alert('xss')</script>`)
    expect(html).toContain('<h1>Title</h1>')
    expect(html).not.toContain('<script>')
  })

  it('creates a capped excerpt with ellipsis when content exceeds the limit', () => {
    const repeatingText = Array.from({ length: 20 }, (_, idx) => `chunk-${idx}`).join(' ')
    const excerpt = markdownExcerpt(repeatingText, 30)
    expect(excerpt.length).toBeLessThanOrEqual(31)
    expect(excerpt.endsWith('…')).toBe(true)
  })

  it('returns the full text when within the limit', () => {
    const excerpt = markdownExcerpt('Short text', 50)
    expect(excerpt).toBe('Short text')
  })
})
