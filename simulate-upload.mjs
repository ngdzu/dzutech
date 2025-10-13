import fs from 'fs/promises'
import path from 'path'
import { parseFrontmatter } from './server/src/markdown.js'
import { savePosts } from './server/src/repository.js'

async function simulateUpload() {
  try {
    // Read the markdown file
    const filePath = path.resolve('server/dev-data/blogs/00one.md')
    const content = await fs.readFile(filePath, 'utf8')

    console.log('Original content preview:')
    console.log(content.substring(0, 200) + '...')

    // Parse frontmatter
    const { frontmatter, content: cleanContent } = parseFrontmatter(content)

    console.log('\nParsed frontmatter:', frontmatter)
    console.log('Tags:', frontmatter.tags)

    // Create post object like the upload handler does
    const name = '00one'
    const title = name.replace(/[-_]/g, ' ').replace(/\.(md)$/i, '') || '00one'

    const post = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      content: cleanContent,
      contentHtml: '',
      tags: frontmatter.tags || [],
      hidden: false,
      createdAt: new Date().toISOString(),
    }

    console.log('\nCreated post object:')
    console.log(JSON.stringify(post, null, 2))

    // Save the post
    const saved = await savePosts([post])
    console.log('\nSaved posts:', saved)

    console.log('\nUpload simulation completed successfully!')

  } catch (error) {
    console.error('Upload simulation failed:', error)
  }
}

simulateUpload()