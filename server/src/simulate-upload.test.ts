import { describe, it, expect } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import { parseFrontmatter } from './markdown.js'
import { normalizePost } from './repository.js'

describe('Upload Simulation', () => {
  it('should simulate the full upload process', async () => {
    // Read the markdown file
    const filePath = path.resolve('./dev-data/blogs/00one.md')
    const fullText = await fs.readFile(filePath, 'utf8')

    console.log('Full text first 200 chars:')
    console.log(fullText.substring(0, 200))

    // Simulate mdUploadHandler logic
    const { frontmatter, content } = parseFrontmatter(fullText)
    const tags = frontmatter.tags || []

    console.log('First parse - frontmatter:', frontmatter)
    console.log('First parse - tags:', tags)
    console.log('First parse - content length:', content.length)

    const post = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: '00one',
      content,  // Clean content with frontmatter stripped
      contentHtml: '',
      tags,     // Tags from first parse
      hidden: false,
      createdAt: new Date().toISOString(),
    }

    console.log('Post object before normalizePost:')
    console.log('  tags:', post.tags)
    console.log('  tags type:', typeof post.tags)
    console.log('  tags isArray:', Array.isArray(post.tags))

    // Simulate savePosts logic
    const fallback = {
      id: 'fallback-id',
      title: '',
      content: '',
      contentHtml: '',
      tags: [],  // This is the fallback tags
      hidden: false,
      createdAt: new Date().toISOString(),
    }

    const normalized = normalizePost(post, fallback)

    console.log('Normalized post tags:', normalized.tags)
    console.log('Normalized post tags type:', typeof normalized.tags)
    console.log('Normalized post tags isArray:', Array.isArray(normalized.tags))

    expect(normalized.tags).toEqual(['javascript', 'tutorial', 'react'])
  })
})