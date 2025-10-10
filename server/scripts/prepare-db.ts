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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      sid VARCHAR NOT NULL COLLATE "default",
      sess JSON NOT NULL,
      expire TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (sid)
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS user_sessions_expire_idx ON user_sessions (expire)
  `)

  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS uploads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key TEXT NOT NULL UNIQUE,
      filename TEXT NOT NULL,
      mimetype TEXT,
      size BIGINT,
      width INT,
      height INT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
