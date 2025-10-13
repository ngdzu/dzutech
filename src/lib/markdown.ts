import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({
  gfm: true,
  breaks: true,
})

const sanitizeHtml = (html: string): string => {
  if (typeof window === 'undefined') {
    return html
  }

  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}

export const renderMarkdown = (markdown: string): string => {
  const raw = typeof markdown === 'string' ? markdown : ''
  // Strip frontmatter if present
  const { content } = parseFrontmatter(raw)
  const rendered = marked.parse(content, { async: false })
  const html = typeof rendered === 'string' ? rendered : ''
  return sanitizeHtml(html)
}

export const markdownToPlainText = (markdown: string): string => {
  const html = renderMarkdown(markdown)

  if (typeof window === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }

  const temp = window.document.createElement('div')
  temp.innerHTML = html
  return temp.textContent?.trim() ?? ''
}

export const markdownExcerpt = (markdown: string, maxLength = 220): string => {
  const text = markdownToPlainText(markdown)
  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength).trimEnd()}…`
}

export interface FrontmatterData {
  tags?: string[]
  [key: string]: unknown
}

export const parseFrontmatter = (markdown: string): { frontmatter: FrontmatterData; content: string } => {
  const lines = markdown.split('\n')
  const frontmatter: FrontmatterData = {}
  let contentStartIndex = 0

  // Check for frontmatter (--- delimiter)
  if (lines.length >= 3 && lines[0].trim() === '---') {
    let endIndex = -1
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        endIndex = i
        break
      }
    }

    if (endIndex > 0) {
      const frontmatterLines = lines.slice(1, endIndex)
      const frontmatterText = frontmatterLines.join('\n')

      try {
        // Simple YAML-like parser for frontmatter
        const parsed = parseYamlLike(frontmatterText)
        Object.assign(frontmatter, parsed)
      } catch (error) {
        console.warn('Failed to parse frontmatter:', error)
      }

      contentStartIndex = endIndex + 1
    }
  }

  const content = lines.slice(contentStartIndex).join('\n').trim()
  return { frontmatter, content }
}

const parseYamlLike = (yamlText: string): FrontmatterData => {
  const result: FrontmatterData = {}
  const lines = yamlText.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'))

  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const key = line.slice(0, colonIndex).trim()
    const value = line.slice(colonIndex + 1).trim()

    if (key === 'tags') {
      // Parse tags array
      if (value.startsWith('[') && value.endsWith(']')) {
        // JSON array format: tags: ["tag1", "tag2"]
        try {
          result.tags = JSON.parse(value)
        } catch {
          // Fallback to comma-separated
          result.tags = value.slice(1, -1).split(',').map(tag => tag.trim().replace(/^["']|["']$/g, ''))
        }
      } else {
        // Comma-separated format: tags: tag1, tag2, tag3
        result.tags = value.split(',').map(tag => tag.trim().replace(/^["']|["']$/g, ''))
      }
      // Filter out empty tags
      result.tags = result.tags?.filter(tag => tag.length > 0) || []
    } else {
      // For other fields, try to parse as JSON, otherwise keep as string
      try {
        result[key] = JSON.parse(value)
      } catch {
        result[key] = value.replace(/^["']|["']$/g, '') // Remove quotes if present
      }
    }
  }

  return result
}
