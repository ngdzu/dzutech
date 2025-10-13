import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const dirsToScan = [
  path.join(serverRoot, 'dev-data', 'blogs'),
  path.join(serverRoot, '..', 'server', 'dev-data', 'blogs'), // handle stray folder from earlier runs
]

const readJson = async (p: string) => JSON.parse(await fs.readFile(p, 'utf8'))

const words = (s: string) => (s.match(/\S+/g) || []).length

const run = async () => {
  const metas: Record<string, unknown>[] = []

  for (const dir of dirsToScan) {
    let entries: string[] = []
    try {
      entries = await fs.readdir(dir)
    } catch {
      // skip missing dirs
      continue
    }

    for (const name of entries) {
      const full = path.join(dir, name)
      if (name === 'posts-index.json') continue
      if (name.endsWith('.json')) {
        try {
          const raw = await readJson(full)
          const obj = (raw ?? {}) as Record<string, unknown>
          if (typeof obj !== 'object' || obj === null) continue
          const idVal = typeof obj.id === 'string' ? obj.id : undefined
          const contentVal = typeof obj.content === 'string' ? obj.content : undefined
          if (!idVal || !contentVal) {
            // not a blog json or malformed
            continue
          }
          // ensure target dir is server/dev-data/blogs
          const targetDir = path.join(serverRoot, 'dev-data', 'blogs')
          await fs.mkdir(targetDir, { recursive: true })
          const mdName = `${idVal}.md`
          const mdPath = path.join(targetDir, mdName)
          // If content is already a path, attempt to read original json content file? but here content is full text
          const contentText = contentVal
          await fs.writeFile(mdPath, contentText, 'utf8')

          // Build metadata pointing to relative path from server folder
          const relativePath = path.relative(serverRoot, mdPath)
          const meta = {
            id: idVal,
            title: typeof obj.title === 'string' ? obj.title : `Post ${idVal}`,
            content: relativePath.replaceAll('\\', '/'),
            tags: Array.isArray(obj.tags) ? obj.tags : [],
            hidden: typeof obj.hidden === 'boolean' ? obj.hidden : false,
            createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : new Date().toISOString(),
            updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : (typeof obj.createdAt === 'string' ? obj.createdAt : new Date().toISOString()),
          }
          metas.push(meta)

          // remove the old json file
          await fs.unlink(full)
          console.log(`Converted ${full} -> ${mdPath} (${words(contentText)} words)`)
          } catch (innerErr) {
            console.error('Failed to convert', full, innerErr)
          }
      }
    }
  }

  // merge with existing posts-index.json if present in server/dev-data/blogs
  const indexPath = path.join(serverRoot, 'dev-data', 'blogs', 'posts-index.json')
  let existing: Record<string, unknown>[] = []
  try {
    const idxRaw = await fs.readFile(indexPath, 'utf8')
    existing = JSON.parse(idxRaw)
  } catch {
    existing = []
  }

  // build map by id to avoid duplicates
  const map = new Map<string, Record<string, unknown>>()
  for (const e of existing) {
    const rec = e as Record<string, unknown>
    if (rec && typeof rec.id === 'string') map.set(rec.id as string, rec)
  }
  for (const m of metas) {
    const rec = m as Record<string, unknown>
    if (rec && typeof rec.id === 'string') map.set(rec.id as string, rec)
  }

  const merged = Array.from(map.values()).sort((a, b) => {
    const aRec = a as Record<string, unknown>
    const bRec = b as Record<string, unknown>
    const aCreated = typeof aRec.createdAt === 'string' ? (aRec.createdAt as string) : ''
    const bCreated = typeof bRec.createdAt === 'string' ? (bRec.createdAt as string) : ''
    return bCreated.localeCompare(aCreated)
  })
  await fs.writeFile(indexPath, JSON.stringify(merged, null, 2), 'utf8')
  console.log(`Wrote index ${indexPath} with ${merged.length} entries`)
}

run().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
