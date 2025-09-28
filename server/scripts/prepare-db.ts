import { pool, readJson, writeJson } from '../src/db.js'
import { defaultContent } from '../src/defaultContent.js'

const ensureSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS content (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

const ensureSeedData = async () => {
  const result = await pool.query<{ key: string }>('SELECT key FROM content')
  if (result.rowCount === 0) {
    console.log('Seeding default content...')
    for (const [key, value] of Object.entries(defaultContent)) {
      await writeJson(key, value)
    }
    return
  }

  // Ensure all keys exist, but keep existing overrides
  for (const [key, value] of Object.entries(defaultContent)) {
    const existing = await readJson(key)
    if (existing === undefined) {
      await writeJson(key, value)
    }
  }
}

const main = async () => {
  try {
    await ensureSchema()
    await ensureSeedData()
    console.log('Database ready.')
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error('Failed to prepare database', error)
  process.exitCode = 1
})
