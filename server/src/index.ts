import cors from 'cors'
import dotenv from 'dotenv'
import express, { type NextFunction, type Request, type Response } from 'express'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
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
  return isProduction ? 'strict' : 'lax'
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

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.session?.user) {
    next()
    return
  }
  res.status(401).json({ message: 'Authentication required' })
}

const regenerateSession = (req: Request): Promise<void> =>
  new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
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
    if (normalizedEmail !== normalizeEmail(adminEmail)) {
      res.status(401).json({ message: 'Invalid credentials' })
      return
    }

    const passwordMatches = await bcrypt.compare(password, adminPasswordHash ?? '')
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

app.get('/api/content', async (_req: Request, res: Response) => {
  try {
    const content = await getContent()
    res.json(content)
  } catch (error) {
    console.error('Failed to load content', error)
    res.status(500).json({ message: 'Failed to load content' })
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

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Not found' })
})

app.listen(port, () => {
  console.log(`API server listening on port ${port}`)
})
