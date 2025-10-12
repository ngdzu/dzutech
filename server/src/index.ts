/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import cors from 'cors'
import dotenv from 'dotenv'
import express, { type NextFunction, type Request, type Response } from 'express'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { listUploads } from './repository.js'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import path from 'path'
import fs from 'fs/promises'
import uploadsRouter from './uploads.js'
import {
  getContent,
  resetContent,
  saveExperiences,
  savePosts,
  saveProfile,
  saveSections,
  removePostById,
  setPostHidden,
} from './repository.js'
import type { Experience, Post, Profile, SectionsContent } from './types.js'
import { validateExperience, validatePost, validateSections } from './validators.js'
import { pool } from './db.js'

const validEmail = (email: string) => /.+@.+\..+/.test(email)

dotenv.config()

const app = express()
const port = Number(process.env.PORT ?? 4000)
const nodeEnv = process.env.NODE_ENV ?? 'development'
const rawAllowedOrigins = process.env.ALLOWED_ORIGIN
  ?.split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0)

if ((!rawAllowedOrigins || rawAllowedOrigins.length === 0) && nodeEnv === 'production') {
  throw new Error('ALLOWED_ORIGIN must be configured with at least one domain in production')
}

const allowedOrigin = rawAllowedOrigins && rawAllowedOrigins.length > 0 ? rawAllowedOrigins : '*'

const sessionSecret = process.env.SESSION_SECRET
if (!sessionSecret) {
  throw new Error('SESSION_SECRET is required to start the API server')
}

if (nodeEnv === 'production' && sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must be at least 32 characters in production environments')
}

const adminEmail = process.env.ADMIN_EMAIL?.trim() ?? ''
const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH?.trim()

if (!adminEmail || !adminPasswordHash) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD_HASH must be configured for admin access')
}

const sessionName = process.env.SESSION_NAME ?? 'dzutech.sid'
const isProduction = process.env.NODE_ENV === 'production'
const sessionMaxAgeHours = Number.parseInt(process.env.SESSION_MAX_AGE_HOURS ?? '12', 10)
const sessionMaxAgeMs = Number.isFinite(sessionMaxAgeHours) && sessionMaxAgeHours > 0
  ? sessionMaxAgeHours * 60 * 60 * 1000
  : 12 * 60 * 60 * 1000

const resolveCookieSecure = () => {
  const raw = process.env.SESSION_COOKIE_SECURE?.toLowerCase()
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (raw === 'auto') return 'auto'
  return 'auto'
}

const parseSameSite = () => {
  const raw = process.env.SESSION_COOKIE_SAMESITE?.toLowerCase()
  if (raw === 'strict' || raw === 'lax' || raw === 'none') {
    return raw
  }
  const prod = process.env.NODE_ENV === 'production'
  return prod ? 'strict' : 'lax'
}

const sessionCookieSecure = resolveCookieSecure()
const sessionCookieSameSite = parseSameSite()

const PgSessionStore = connectPgSimple(session)

app.set('trust proxy', 1)

app.use(express.json())
app.use(
  cors({
    origin: allowedOrigin ?? '*',
    credentials: true,
  }),
)

app.use(
  session({
    name: sessionName,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: sessionCookieSecure,
      sameSite: sessionCookieSameSite,
      maxAge: sessionMaxAgeMs,
    },
    store: new PgSessionStore({
      pool,
      tableName: 'user_sessions',
    }),
  }),
)

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again soon.' },
})

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const asyncHandler =
  <Params, ResBody, ReqBody>(
    handler: (req: Request<Params, ResBody, ReqBody>, res: Response<ResBody>, next: NextFunction) => Promise<void>,
  ) =>
    (req: Request<Params, ResBody, ReqBody>, res: Response<ResBody>, next: NextFunction) => {
      handler(req, res, next).catch(next)
    }

// Export small helpers for unit testing
export { resolveCookieSecure, parseSameSite, normalizeEmail, asyncHandler }

import { requireAuth } from './requireAuth.js'
import { getUploadById } from './repository.js'

// Create a shared S3 client when S3 is configured so it can be reused by
// the proxy, presigner, and other routes. dotenv.config() already ran.
const s3Configured = !!(process.env.S3_ENDPOINT && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.S3_BUCKET)
let s3Client: S3Client | undefined = undefined
if (s3Configured) {
  s3Client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' || process.env.S3_FORCE_PATH_STYLE === '1',
  } as any)
}

const PRESIGNED_URL_EXPIRES = Number(process.env.PRESIGNED_URL_EXPIRES_SECONDS ?? '3600')

async function generatePresignedUrlForKey(key: string, expires = PRESIGNED_URL_EXPIRES): Promise<string | null> {
  if (!s3Client) throw new Error('S3 is not configured')
  const bucket = process.env.S3_BUCKET as string
  const cleanedKey = key.replace(/^\//, '')

  // If a public S3 endpoint is explicitly provided, generate the presigned
  // URL against that public endpoint so the host in the signature matches the
  // address the browser will use.
  const publicEndpoint = process.env.PUBLIC_S3_ENDPOINT?.replace(/\/$/, '')
  if (publicEndpoint) {
    try {
      const publicClient = new S3Client({
        endpoint: publicEndpoint,
        region: process.env.S3_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
        },
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' || process.env.S3_FORCE_PATH_STYLE === '1',
      } as any)
      const cmd = new GetObjectCommand({ Bucket: bucket, Key: cleanedKey })
      return await getSignedUrl(publicClient, cmd, { expiresIn: expires })
    } catch (err) {
      console.error('Failed to generate presigned URL with PUBLIC_S3_ENDPOINT', publicEndpoint, err)
      return null
    }
  }

  // If no public endpoint is provided, avoid generating presigned URLs when
  // the configured S3 endpoint is an internal Docker hostname (like 'minio'),
  // because the signature will include that internal hostname and the browser
  // cannot reach it. In that case return null so callers can fall back to the
  // API proxy (`/uploads/<file>`) which streams objects via the server.
  try {
    const configured = new URL(process.env.S3_ENDPOINT as string)
    const cfgHost = configured.hostname
    if (cfgHost && cfgHost.includes('minio')) {
      // Indicate presigning not usable for browser access in this environment
      return null
    }
  } catch (err) {
    // If parsing fails, proceed and attempt to presign with default client
  }

  try {
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: cleanedKey })
    return await getSignedUrl(s3Client as S3Client, cmd, { expiresIn: expires })
  } catch (err) {
    console.error('Failed to generate presigned URL with default S3 client', err)
    return null
  }
}

const regenerateSession = (req: Request): Promise<void> =>
  new Promise((resolve, reject) => {
    if (nodeEnv === 'test') {
      // Avoid regenerating sessions in the test environment where session mocks
      // may not fully implement the API
      resolve()
      return
    }
    const regen = (req.session as { regenerate?: unknown })?.regenerate
    if (typeof regen !== 'function') {
      // Some session implementations may not implement regenerate; treat as no-op
      resolve()
      return
    }
    (req.session as { regenerate: (cb: (err?: unknown) => void) => void }).regenerate((error?: unknown) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })

app.get('/api/auth/me', (req: Request, res: Response) => {
  if (!req.session?.user) {
    res.status(401).json({ message: 'Not authenticated' })
    return
  }
  res.json(req.session.user)
})

app.post(
  '/api/auth/login',
  loginLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.body || typeof req.body !== 'object') {
      res.status(400).json({ message: 'Email and password are required' })
      return
    }

    const { email, password } = req.body as { email?: unknown; password?: unknown }

    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ message: 'Email and password are required' })
      return
    }

    const normalizedEmail = normalizeEmail(email)
  // debug logs to help tests diagnose failures when mocks are in play
  console.error('LOGIN DEBUG normalizedEmail, adminEmail, adminPasswordHash:', normalizedEmail, adminEmail, !!adminPasswordHash)
    if (normalizedEmail !== normalizeEmail(adminEmail)) {
      res.status(401).json({ message: 'Invalid credentials' })
      return
    }

    const passwordMatches = await bcrypt.compare(password, adminPasswordHash ?? '')
  console.error('LOGIN DEBUG bcrypt compare result:', !!passwordMatches)
    if (!passwordMatches) {
      res.status(401).json({ message: 'Invalid credentials' })
      return
    }

    await regenerateSession(req)

    req.session.user = {
      email: adminEmail,
      loggedInAt: new Date().toISOString(),
    }

    res.json({ email: adminEmail })
  }),
)

app.post('/api/auth/logout', requireAuth, (req: Request, res: Response) => {
  const clearCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ('strict' as const) : ('lax' as const),
  }

  req.session.destroy((error) => {
    if (error) {
      console.error('Failed to destroy session on logout', error)
      res.status(500).json({ message: 'Failed to log out' })
      return
    }

    res.clearCookie(sessionName, clearCookieOptions)
    res.json({ success: true })
  })
})

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

// Serve photos by id. This returns a redirect to the object store (S3/MinIO) if configured,
// otherwise serves the local file from the uploads directory.
app.get('/photos/:id', async (req: Request, res: Response) => {
  try {
    const raw = req.params.id

    // Decide whether the param is a DB id (UUID) or a filename/key. The uploads table
    // uses UUIDs for the primary key; pre-existing links in markdown may reference the
    // original filename (e.g. `/photos/17600...png`). Support both forms: if the
    // incoming segment resembles a UUID, look up by id; otherwise treat it as a
    // filename and redirect/serve the object directly.
    let record = null
    const looksLikeUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(raw)
    if (looksLikeUuid) {
      record = await getUploadById(raw)
      if (!record) return res.status(404).json({ message: 'Not found' })
    }

    const s3Endpoint = process.env.S3_ENDPOINT
    if (s3Endpoint) {
      // Prefer a public-facing website origin when available. If PUBLIC_BASE_URL is set
      // we return a path under that origin so the website (or nginx) can proxy/serve it.
      const publicBase = process.env.PUBLIC_BASE_URL
      if (publicBase) {
        // If we have a DB record prefer its filename; otherwise fall back to the raw param.
        const filename = record ? record.filename : raw
        return res.redirect(302, `/uploads/${filename}`)
      }

      // Allow overriding the S3 endpoint used for browser redirects with PUBLIC_S3_ENDPOINT.
      // This helps local dev where the MinIO container is reachable as 'minio' inside Docker
      // but must be referenced as 'localhost' from the host/browser.
      const publicS3Endpoint = (process.env.PUBLIC_S3_ENDPOINT ?? process.env.S3_ENDPOINT) as string | undefined
      const bucket = process.env.S3_BUCKET
      if (!bucket) return res.status(500).json({ message: 'S3 bucket not configured' })
      if (!publicS3Endpoint) return res.status(500).json({ message: 'S3 endpoint not configured' })

      // If the configured endpoint looks like the internal Docker host (for example
      // 'http://minio:9000') and we're not in production, rewrite the hostname to
      // 'localhost' so browsers can reach MinIO on the host-mapped port during local dev.
      let endpointToUse = publicS3Endpoint.replace(/\/$/, '')
      try {
        const parsed = new URL(endpointToUse)
        // If the configured endpoint points at an internal Docker hostname such as
        // 'minio' and the incoming request appears to originate from the host (the
        // Host header contains 'localhost' or '127.0.0.1'), rewrite the hostname to
        // 'localhost' so the browser can reach the mapped MinIO port on the host.
        const hostHeader = (req.get('host') || '').toLowerCase()
        const isLocalBrowser = hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1')
        if (parsed.hostname && parsed.hostname.includes('minio') && isLocalBrowser) {
          parsed.hostname = 'localhost'
          endpointToUse = parsed.toString().replace(/\/$/, '')
        }
      } catch (e) {
        // ignore URL parse errors and fall back to the raw string
      }

      // If we resolved a DB record, redirect to that object's key. Otherwise, assume
      // the caller provided an original filename (or key suffix) and build the URL
      // from that.
      const keyOrFilename = record ? record.key.replace(/^\//, '') : `uploads/${raw}`
      // Prefer returning a presigned URL when possible so browsers can fetch the
      // object even when the bucket is private. If presigning fails, fall back to
      // building a public redirect URL (which may not work for private buckets).
      try {
        if (s3Client) {
          const presigned = await generatePresignedUrlForKey(keyOrFilename)
          if (presigned) return res.redirect(302, presigned)
        }
      } catch (err) {
        console.error('Failed to presign URL, falling back to direct object URL', err)
      }

      // If presigning is not possible (e.g. internal-only MinIO), fall back to
      // the API proxy path which streams objects server-side. This is reachable
      // from the browser even when the object store hostname is internal.
      const proxyPath = `/uploads/${keyOrFilename.replace(/^uploads\//, '')}`
      return res.redirect(302, proxyPath)
    }

  // Fallback to serving local file
  const uploadDir = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.resolve(process.cwd(), 'uploads')
  // If we have a DB record, use its key. Otherwise assume 'raw' is a filename under uploads/.
  const keyToUse = record ? record.key.replace(/^uploads\//, '') : `uploads/${raw}`
  const filepath = path.join(uploadDir, keyToUse.replace(/^uploads\//, ''))
  return res.sendFile(filepath)
  } catch (err) {
    console.error('failed to serve photo', err)
    return res.status(500).json({ message: 'Failed to serve photo' })
  }
})

app.get('/api/content', async (_req: Request, res: Response) => {
  try {
    const content = await getContent()
    res.json(content)
  } catch (error) {
    console.error('Failed to load content', error)
    res.status(500).json({ message: 'Failed to load content' })
  }
})

// Admin: list uploaded photos (paginated)
app.get('/api/admin/uploads', requireAuth, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number.parseInt(String(req.query.limit ?? '50'), 10) || 50, 500)
    const offset = Math.max(Number.parseInt(String(req.query.offset ?? '0'), 10) || 0, 0)
    const data = await listUploads(limit, offset)
    // If S3 is configured, attempt to include a presigned URL for each row to
    // allow the frontend to load thumbnails or link directly to the object
    // (which is beneficial for CDNs or caching). We build presigned URLs for
    // each object's key. Failures to presign a particular object do not block
    // the entire response.
    if (s3Client) {
      const rowsWithPresigned = await Promise.all(
        data.rows.map(async (r: any) => {
          try {
            const presignedUrl = await generatePresignedUrlForKey(r.key)
            return { ...r, presignedUrl }
          } catch (err) {
            console.error('Failed to generate presigned URL for', r.key, err)
            return r
          }
        }),
      )
      res.json({ uploads: rowsWithPresigned, total: data.total })
      return
    }

    res.json({ uploads: data.rows, total: data.total })
  } catch (err) {
    console.error('Failed to list uploads', err)
    res.status(500).json({ message: 'Failed to list uploads' })
  }
})

app.put('/api/profile', requireAuth, async (req: Request, res: Response) => {
  const payload = req.body as Partial<Profile>
  if (!payload) {
    return res.status(400).json({ message: 'Missing payload' })
  }

  let profile: Profile
  try {
    profile = (await getContent()).profile
  } catch (error) {
    console.error('Failed to load existing profile', error)
    return res.status(500).json({ message: 'Failed to load existing profile' })
  }

  const sanitizeHighlight = (
    incoming: Partial<Profile['availability']> | undefined,
    current: Profile['availability'],
    label: string,
    maxLength: number,
    highlightsEnabled: boolean,
  ) => {
    const rawValue = typeof incoming?.value === 'string' ? incoming.value : current.value
    const trimmedValue = rawValue.trim()
    const fallbackEnabled =
      typeof incoming?.enabled === 'boolean' ? incoming.enabled : current.enabled ?? true

    if (trimmedValue.length > maxLength) {
      throw new Error(`${label} must be ${maxLength} characters or fewer`)
    }

    if (highlightsEnabled && trimmedValue.length === 0) {
      throw new Error(`${label} is required when highlights are visible`)
    }

    return {
      value: trimmedValue,
      enabled: highlightsEnabled && trimmedValue.length > 0 && fallbackEnabled,
    }
  }

  const next: Profile = {
    name: payload.name ?? profile.name,
    title: payload.title ?? profile.title,
    tagline: payload.tagline ?? profile.tagline,
    summary: payload.summary ?? profile.summary,
    location:
      typeof payload.location === 'string' ? payload.location.trim() : profile.location.trim(),
    email: payload.email ?? profile.email,
    social: {
      linkedin:
        typeof payload.social?.linkedin === 'string'
          ? payload.social.linkedin.trim()
          : profile.social.linkedin.trim(),
      github:
        typeof payload.social?.github === 'string'
          ? payload.social.github.trim()
          : profile.social.github.trim(),
    },
    contactVisibility: {
      email:
        typeof payload.contactVisibility?.email === 'boolean'
          ? payload.contactVisibility.email
          : profile.contactVisibility?.email ?? true,
      linkedin:
        typeof payload.contactVisibility?.linkedin === 'boolean'
          ? payload.contactVisibility.linkedin
          : profile.contactVisibility?.linkedin ?? true,
      github:
        typeof payload.contactVisibility?.github === 'boolean'
          ? payload.contactVisibility.github
          : profile.contactVisibility?.github ?? true,
    },
    highlightsEnabled:
      typeof payload.highlightsEnabled === 'boolean'
        ? payload.highlightsEnabled
        : profile.highlightsEnabled ?? true,
    availability: profile.availability,
    focusAreas: profile.focusAreas,
  }

  try {
    if (next.highlightsEnabled && !next.location) {
      throw new Error('Location is required when highlights are visible')
    }
  } catch (validationError) {
    return res.status(422).json({
      message:
        validationError instanceof Error
          ? validationError.message
          : 'Invalid highlight provided',
    })
  }

  try {
    next.availability = sanitizeHighlight(
      payload.availability,
      profile.availability,
      'Availability',
      50,
      next.highlightsEnabled,
    )
    next.focusAreas = sanitizeHighlight(
      payload.focusAreas,
      profile.focusAreas,
      'Focus areas',
      80,
      next.highlightsEnabled,
    )
  } catch (validationError) {
    return res.status(422).json({
      message:
        validationError instanceof Error
          ? validationError.message
          : 'Invalid highlight provided',
    })
  }

  if (!next.name.trim()) {
    return res.status(422).json({ message: 'Name is required' })
  }

  if (!validEmail(next.email)) {
    return res.status(422).json({ message: 'Valid email is required' })
  }

  try {
    const saved = await saveProfile(next)
    res.json(saved)
  } catch (error) {
    console.error('Failed to save profile', error)
    res.status(500).json({ message: 'Failed to save profile' })
  }
})

app.put('/api/posts', requireAuth, async (req: Request, res: Response) => {
  const payload = req.body as unknown

  if (!Array.isArray(payload)) {
    return res.status(400).json({ message: 'Payload must be an array of posts' })
  }

  const postsPayload = payload as Array<Partial<Post> & Record<string, unknown>>

  for (let index = 0; index < payload.length; index += 1) {
    const error = validatePost(postsPayload[index], index)
    if (error) {
      return res.status(422).json({ message: error })
    }
  }

  try {
    const saved = await savePosts(postsPayload)
    res.json(saved)
  } catch (error) {
    console.error('Failed to save posts', error)
    res.status(500).json({ message: 'Failed to save posts' })
  }
})

app.delete(
  '/api/posts/:postId',
  requireAuth,
  asyncHandler(async (req: Request<{ postId: string }>, res: Response) => {
    const postId = req.params.postId?.trim()

    if (!postId) {
      res.status(400).json({ message: 'Post identifier is required' })
      return
    }

    try {
      const posts = await removePostById(postId)
      res.json(posts)
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'POST_NOT_FOUND') {
        res.status(404).json({ message: 'Post not found' })
        return
      }
      throw error
    }
  }),
)

app.patch(
  '/api/posts/:postId/visibility',
  requireAuth,
  asyncHandler(async (req: Request<{ postId: string }, Post[], { hidden?: unknown }>, res: Response) => {
    const postId = req.params.postId?.trim()

    if (!postId) {
      res.status(400).json({ message: 'Post identifier is required' })
      return
    }

    const hiddenValue = req.body?.hidden
    if (typeof hiddenValue !== 'boolean') {
      res.status(400).json({ message: 'Hidden flag must be provided as a boolean' })
      return
    }

    try {
      const posts = await setPostHidden(postId, hiddenValue)
      res.json(posts)
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'POST_NOT_FOUND') {
        res.status(404).json({ message: 'Post not found' })
        return
      }
      throw error
    }
  }),
)

app.put('/api/sections', requireAuth, async (req: Request, res: Response) => {
  const payload = req.body as Partial<SectionsContent> | undefined

  let currentSections: SectionsContent
  try {
    currentSections = (await getContent()).sections
  } catch (error) {
    console.error('Failed to load existing sections', error)
    return res.status(500).json({ message: 'Failed to load existing sections' })
  }

  const next: SectionsContent = {
    contact: {
      description:
        typeof payload?.contact?.description === 'string'
          ? payload.contact.description
          : currentSections.contact.description,
    },
    experiencesPage: {
      visible:
        typeof payload?.experiencesPage?.visible === 'boolean'
          ? payload.experiencesPage.visible
          : currentSections.experiencesPage?.visible ?? true,
    },
    educations: {
      visible:
        typeof payload?.educations?.visible === 'boolean'
          ? payload.educations.visible
          : currentSections.educations?.visible ?? true,
      items: Array.isArray(payload?.educations?.items)
        ? payload!.educations!.items.map((e) => ({
          institution: typeof e?.institution === 'string' ? e.institution : '',
          degree: typeof e?.degree === 'string' ? e.degree : undefined,
          year: typeof e?.year === 'string' ? e.year : undefined,
          description: typeof e?.description === 'string' ? e.description : undefined,
        }))
        : currentSections.educations?.items ?? [],
    },
    programmingLanguages: {
      visible:
        typeof payload?.programmingLanguages?.visible === 'boolean'
          ? payload.programmingLanguages.visible
          : currentSections.programmingLanguages?.visible ?? true,
      items: Array.isArray(payload?.programmingLanguages?.items)
        ? payload!.programmingLanguages!.items.map((s) => (typeof s === 'string' ? s : '')).filter(Boolean)
        : currentSections.programmingLanguages?.items ?? [],
    },
    languagesSpoken: {
      visible:
        typeof payload?.languagesSpoken?.visible === 'boolean'
          ? payload.languagesSpoken.visible
          : currentSections.languagesSpoken?.visible ?? true,
      items: Array.isArray(payload?.languagesSpoken?.items)
        ? payload!.languagesSpoken!.items.map((s) => (typeof s === 'string' ? s : '')).filter(Boolean)
        : currentSections.languagesSpoken?.items ?? [],
    },
    achievements: {
      visible:
        typeof payload?.achievements?.visible === 'boolean'
          ? payload.achievements.visible
          : currentSections.achievements?.visible ?? true,
      items: Array.isArray(payload?.achievements?.items)
        ? payload!.achievements!.items.map((s) => (typeof s === 'string' ? s : '')).filter(Boolean)
        : currentSections.achievements?.items ?? [],
    },
  }

  const errorMessage = validateSections(next)
  if (errorMessage) {
    return res.status(422).json({ message: errorMessage })
  }

  try {
    const saved = await saveSections(next)
    res.json(saved)
  } catch (error) {
    console.error('Failed to save sections', error)
    res.status(500).json({ message: 'Failed to save sections' })
  }
})

app.put('/api/experiences', requireAuth, async (req: Request, res: Response) => {
  const payload = req.body as Experience[]
  if (!Array.isArray(payload)) {
    return res.status(400).json({ message: 'Payload must be an array of experiences' })
  }

  for (let index = 0; index < payload.length; index += 1) {
    const error = validateExperience(payload[index], index)
    if (error) {
      return res.status(422).json({ message: error })
    }
  }

  try {
    const saved = await saveExperiences(payload)
    res.json(saved)
  } catch (error) {
    console.error('Failed to save experiences', error)
    res.status(500).json({ message: 'Failed to save experiences' })
  }
})

// Tutorials removed

app.post('/api/reset', requireAuth, async (_req: Request, res: Response) => {
  try {
    const content = await resetContent()
    res.json(content)
  } catch (error) {
    console.error('Failed to reset content', error)
    res.status(500).json({ message: 'Failed to reset content' })
  }
})

// Serve uploaded files
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')

// If S3/MinIO is configured, expose a proxy endpoint that streams objects from
// the bucket so browsers can access uploads via `/uploads/<key>` without a public
// bucket policy. This works for both dev (rewriting hostnames as needed) and prod.
if (process.env.S3_ENDPOINT && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.S3_BUCKET) {
  const s3Client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' || process.env.S3_FORCE_PATH_STYLE === '1',
  } as any)

  app.get('/uploads/*', async (req: Request, res: Response) => {
    try {
      // Build key relative to bucket. req.path is '/uploads/...' — remove leading '/'
      const key = req.path.replace(/^\//, '')
      const bucket = process.env.S3_BUCKET as string
      const cmd = new GetObjectCommand({ Bucket: bucket, Key: key })
      const result = await s3Client.send(cmd)

      // forward content-type and content-length if present
      if (result.ContentType) res.setHeader('Content-Type', result.ContentType)
      if (result.ContentLength) res.setHeader('Content-Length', String(result.ContentLength))
      // Stream the body to the response
      const body = result.Body as any
      if (body && typeof body.pipe === 'function') {
        body.pipe(res)
      } else if (body && typeof body.transform === 'function') {
        // handle Node stream transform variants
        body.pipe(res)
      } else if (body) {
        // fallback: send as array buffer / string
        const buffer = Buffer.from(await body.arrayBuffer())
        res.send(buffer)
      } else {
        res.status(404).end()
      }
    } catch (err: any) {
      console.error('S3 proxy error for uploads:', err)
      const code = err?.name || err?.Code || ''
      if (code === 'NoSuchKey' || code === 'NotFound') {
        // Fall back to local filesystem if S3 doesn't have the file
        const uploadDir = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.resolve(process.cwd(), 'uploads')
        const key = req.path.replace(/^\//, '')
        const filepath = path.join(uploadDir, key.replace(/^uploads\//, ''))
        try {
          await fs.access(filepath)
          return res.sendFile(filepath)
        } catch (localErr) {
          return res.status(404).json({ message: 'Not found' })
        }
      }
      if (err?.$metadata?.httpStatusCode === 403 || code === 'AccessDenied') return res.status(403).json({ message: 'Access denied' })
      return res.status(500).json({ message: 'Failed to fetch upload' })
    }
  })
} else {
  app.use('/uploads', express.static(UPLOAD_DIR))
}

// Mount uploads router (contains POST /api/uploads)
app.use(uploadsRouter)

// Error handler - log error and return 500
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // Log unknown error shapes safely
  const msg = (err && typeof err === 'object' && 'stack' in err) ? (err as { stack?: string }).stack : String(err)
  console.error('UNHANDLED ERROR IN APP:', msg)
  // reference _next to avoid unused variable lint complaints
  void _next
  res.status(500).json({ message: 'Internal server error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Not found' })
})

// Export app for tests to reuse without binding to a network socket.
export { app }

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`API server listening on port ${port}`)
  })
}
