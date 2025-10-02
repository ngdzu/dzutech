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
  const rendered = marked.parse(raw, { async: false })
  const html = typeof rendered === 'string' ? rendered : ''
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}
