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
  const rendered = marked.parse(raw, { async: false })
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
