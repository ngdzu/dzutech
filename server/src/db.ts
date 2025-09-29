import { Pool } from 'pg'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

const databaseUrl =
  process.env.DATABASE_URL ??
  `postgresql://${process.env.DB_USER ?? 'postgres'}:${process.env.DB_PASSWORD ?? 'postgres'}@${process.env.DB_HOST ?? 'db'}:${process.env.DB_PORT ?? '5432'}/${process.env.DB_NAME ?? 'dzutech'}`

const sslMode = process.env.DB_SSL === 'true'

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: sslMode ? { rejectUnauthorized: false } : undefined,
})

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL client error', error)
})

export const readJson = async <T = JsonValue>(key: string): Promise<T | undefined> => {
  const result = await pool.query<{ value_text: string }>(
    'SELECT value::text AS value_text FROM content WHERE key = $1',
    [key],
  )
  if (result.rowCount === 0) return undefined
  return JSON.parse(result.rows[0].value_text) as T
}

export const writeJson = async (key: string, value: JsonValue): Promise<void> => {
  await pool.query(
    `INSERT INTO content(key, value)
     VALUES ($1, $2::jsonb)
     ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, JSON.stringify(value)],
  )
}

