import { Pool } from 'pg'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

const nodeEnv = process.env.NODE_ENV ?? 'development'
const hasCustomDatabaseUrl = typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.trim().length > 0

if (!hasCustomDatabaseUrl && nodeEnv === 'production') {
  throw new Error('DATABASE_URL must be provided in production environments')
}

const fallbackConnectionString = `postgresql://${process.env.DB_USER ?? 'postgres'}:${process.env.DB_PASSWORD ?? 'postgres'}@${process.env.DB_HOST ?? 'db'}:${process.env.DB_PORT ?? '5432'}/${process.env.DB_NAME ?? 'dzutech'}`

const databaseUrl = hasCustomDatabaseUrl ? (process.env.DATABASE_URL as string).trim() : fallbackConnectionString

const sslEnabled = (process.env.DB_SSL ?? '').toLowerCase() === 'true'
const sslRejectUnauthorized = (process.env.DB_SSL_REJECT_UNAUTHORIZED ?? 'true').toLowerCase() !== 'false'
const sslCertificate = process.env.DB_SSL_CA?.replace(/\\n/g, '\n')

if (nodeEnv === 'production' && !sslEnabled) {
  console.warn('DB_SSL is not enabled; enable TLS between the API and database for production deployments.')
}

const sslOptions = sslEnabled
  ? {
      rejectUnauthorized: sslRejectUnauthorized,
      ...(sslCertificate ? { ca: sslCertificate } : {}),
    }
  : undefined

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: sslOptions,
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

