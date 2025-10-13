import { marked } from 'marked'
import createDOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

const { window } = new JSDOM('')
const DOMPurify = (createDOMPurify as (win: unknown) => ReturnType<typeof createDOMPurify>)(window)

marked.setOptions({
  gfm: true,
  breaks: true,
})

export const markdownToHtml = (markdown: string): string => {
  const raw = typeof markdown === 'string' ? markdown : ''
  // Strip frontmatter if present
  const { content } = parseFrontmatter(raw)
  const rendered = marked.parse(content, { async: false })
  const html = typeof rendered === 'string' ? rendered : ''
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}

export interface FrontmatterData {
  tags?: string[]
  [key: string]: unknown
}

export const parseFrontmatter = (markdown: string): { frontmatter: FrontmatterData; content: string } => {
  const lines = markdown.split('\n')
  const frontmatter: FrontmatterData = {}
  let contentStartIndex = 0

  // Find the first non-empty line that could be a frontmatter delimiter
  let startLineIndex = 0
  while (startLineIndex < lines.length && lines[startLineIndex].trim() === '') {
    startLineIndex++
  }

  // Check for frontmatter (--- delimiter)
  if (lines.length >= startLineIndex + 3 && lines[startLineIndex].trim() === '---') {
    let endIndex = -1
    for (let i = startLineIndex + 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        endIndex = i
        break
      }
    }

    if (endIndex > startLineIndex) {
      const frontmatterLines = lines.slice(startLineIndex + 1, endIndex)
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
        result.tags = value.split(',').map(tag => tag.trim().replace(/^["']|["']|["']$/g, ''))
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
