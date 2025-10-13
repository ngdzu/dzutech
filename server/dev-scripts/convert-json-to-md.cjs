const fs = require('fs').promises
const path = require('path')

const serverRoot = path.resolve(__dirname, '..')
const dirsToScan = [
  path.join(serverRoot, 'dev-data', 'blogs'),
  path.join(serverRoot, '..', 'server', 'dev-data', 'blogs'),
]

const words = (s) => (s.match(/\S+/g) || []).length

async function run() {
  const metas = []
  for (const dir of dirsToScan) {
    let entries = []
    try {
      entries = await fs.readdir(dir)
    } catch (err) {
      continue
    }
    for (const name of entries) {
      const full = path.join(dir, name)
      if (name === 'posts-index.json') continue
      if (name.endsWith('.json')) {
        try {
          const raw = await fs.readFile(full, 'utf8')
          const obj = JSON.parse(raw)
          if (!obj || !obj.id) continue
          const targetDir = path.join(serverRoot, 'dev-data', 'blogs')
          await fs.mkdir(targetDir, { recursive: true })
          const mdName = `${obj.id}.md`
          const mdPath = path.join(targetDir, mdName)
          const contentText = String(obj.content ?? '')
          await fs.writeFile(mdPath, contentText, 'utf8')
          const relativePath = path.relative(serverRoot, mdPath).replace(/\\\\/g, '/')
          metas.push({
            id: obj.id,
            title: obj.title ?? `Post ${obj.id}`,
            content: relativePath,
            tags: obj.tags ?? [],
            hidden: obj.hidden ?? false,
            createdAt: obj.createdAt ?? new Date().toISOString(),
            updatedAt: obj.updatedAt ?? obj.createdAt ?? new Date().toISOString(),
          })
          await fs.unlink(full)
          console.log(`Converted ${full} -> ${mdPath} (${words(contentText)} words)`)
        } catch (err) {
          console.error('Failed to convert', full, err)
        }
      }
    }
  }
  const indexPath = path.join(serverRoot, 'dev-data', 'blogs', 'posts-index.json')
  let existing = []
  try {
    const idxRaw = await fs.readFile(indexPath, 'utf8')
    existing = JSON.parse(idxRaw)
  } catch (err) {
    existing = []
  }
  const map = new Map()
  for (const e of existing) map.set(e.id, e)
  for (const m of metas) map.set(m.id, m)
  const merged = Array.from(map.values()).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  await fs.writeFile(indexPath, JSON.stringify(merged, null, 2), 'utf8')
  console.log(`Wrote index ${indexPath} with ${merged.length} entries`)
}

run().catch((err) => { console.error(err); process.exitCode = 1 })
