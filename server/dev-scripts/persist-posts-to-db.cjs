#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const BLOG_DIR = path.join(__dirname, '..', 'dev-data', 'blogs')
const INDEX_PATH = path.join(BLOG_DIR, 'posts-index.json')

async function main() {
  if ((process.env.NODE_ENV ?? 'development') === 'production') {
    console.error('Refusing to run in production')
    process.exit(1)
  }

  if (!fs.existsSync(INDEX_PATH)) {
    console.error('Index not found:', INDEX_PATH)
    process.exit(1)
  }

  const raw = fs.readFileSync(INDEX_PATH, 'utf8')
  const metadata = JSON.parse(raw)
  const toSave = []

  for (const m of metadata) {
    const mdPath = path.resolve(process.cwd(), 'server', m.content)
    if (!fs.existsSync(mdPath)) {
      console.warn('Skipping missing file', mdPath)
      continue
    }
    const md = fs.readFileSync(mdPath, 'utf8')
    toSave.push({ id: m.id, title: m.title, content: md, tags: m.tags, hidden: m.hidden, createdAt: m.createdAt, updatedAt: m.updatedAt })
  }

  if (toSave.length === 0) {
    console.log('No posts to save')
    return
  }

  try {
    let repo = null
    try {
      repo = await import('../src/repository.js')
    } catch (errSrc) {
      // try compiled dist as a fallback
      try {
        repo = await import('../dist/src/repository.js')
      } catch (errDist) {
        throw new Error(`Could not import repository module from src or dist: ${errSrc.message}; ${errDist.message}`)
      }
    }
    if (!repo || typeof repo.savePosts !== 'function') {
      console.error('repository.savePosts not available on import')
      process.exit(1)
    }
    const saved = await repo.savePosts(toSave)
    console.log(`Saved ${Array.isArray(saved) ? saved.length : 0} posts to DB`)
  } catch (err) {
    console.error('Failed to persist posts to DB:', err)
    process.exit(1)
  }
}

main()
