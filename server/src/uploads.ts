/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { type Request, type Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'
// sharp is an optional native dependency that may not be available in all container
// environments (for example on some ARM variants). Import it lazily inside the
// handler so a missing binary doesn't crash the whole process at startup.
import { fileTypeFromBuffer } from 'file-type'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { requireAuth } from './requireAuth.js'
import { saveUpload, savePosts, getContent } from './repository.js'
import { validatePost } from './validators.js'
import { parseFrontmatter } from './markdown.js'

const router = express.Router()

// Resolve upload directory at request time so tests can set process.env.UPLOAD_DIR before calling
const resolveUploadDir = () =>
  (process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.resolve(process.cwd(), 'uploads'))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // allow commonly declared image types in the multipart header; we'll validate the actual content after upload
    const allowedDeclared = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
    cb(null, allowedDeclared.includes(file.mimetype))
  },
})

// Multer instance for markdown file uploads. Allow larger single-file markdown sizes
const mdUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MD_FILE_SIZE_LIMIT ?? 5 * 1024 * 1024) }, // default 5MB per file
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ['text/markdown', 'text/x-markdown', 'text/plain']
    // also accept .md by extension if content-type is missing
    const ext = path.extname(file.originalname || '').toLowerCase()
    if (allowed.includes(file.mimetype) || ext === '.md') {
      cb(null, true)
    } else {
      cb(null, false)
    }
  },
})

// Handler to accept multiple .md files and persist as posts
const mdUploadHandler = async (req: Request, res: Response) => {
  try {
    // req.files can be File[] or a field-keyed object depending on multer usage; cast to any and normalize
    const files = (req.files as any) || []
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: 'No markdown files uploaded' })
    }

    const posts = await Promise.all(files.map(async (f) => {
      // normalize buffer
      let buf: Buffer | null = null
      const raw = f.buffer
      if (Buffer.isBuffer(raw)) buf = raw
      else if (raw && typeof (raw as { arrayBuffer?: unknown }).arrayBuffer === 'function') {
        const ab = await (raw as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer()
        buf = Buffer.from(ab)
      } else if (raw && (raw as { data?: unknown }).data instanceof Uint8Array) {
        buf = Buffer.from((raw as { data: Uint8Array }).data)
      }

      const fullText = buf ? buf.toString('utf8') : ''
      const name = (f.originalname || '').replace(/\.md$/i, '')
      const title = name.replace(/[-_]/g, ' ').replace(/\.(md)$/i, '') || f.originalname

      // Parse frontmatter from markdown content
      const { frontmatter, content } = parseFrontmatter(fullText)
      const tags = frontmatter.tags || []

      const post = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        content,
        contentHtml: '',
        tags,
        hidden: false,
        createdAt: new Date().toISOString(),
      }
      return post
    }))

    // validate posts before saving
    for (let i = 0; i < posts.length; i += 1) {
      const err = validatePost(posts[i] as any, i)
      if (err) return res.status(422).json({ message: err })
    }

  // Merge new posts with existing posts so uploads append rather than replace
  const current = await getContent()
  const allPosts = Array.isArray(current.posts) ? [...posts, ...current.posts] : posts
  const saved = await savePosts(allPosts as any)
    return res.json({ saved, count: saved.length })
  } catch (err: unknown) {
    console.error('mdUploadHandler failed', err)
    return res.status(500).json({ message: 'Failed to import markdown files' })
  }
}

// Route for admin markdown uploads (multiple files under field name 'files')
router.post('/api/admin/posts/upload', requireAuth, mdUpload.array('files', 50), mdUploadHandler)

// Use shared requireAuth middleware

type UploadedFile = { originalname: string; mimetype: string; buffer: unknown }
type MulterRequest = Request & { file?: UploadedFile }

const uploadHandler = async (req: MulterRequest, res: express.Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })

    const { originalname, mimetype, buffer } = req.file
    // perform content-based type detection to avoid files masquerading as images
    // normalize various possible buffer-like shapes that may come from multer or polyfills
  let normalizedBuffer: Uint8Array | ArrayBuffer | Buffer | null = null
    // Buffer from multer memoryStorage
    if (Buffer.isBuffer(buffer)) {
      normalizedBuffer = buffer
    } else if (ArrayBuffer.isView(buffer)) {
      // covers Uint8Array and other typed array views
      const view = buffer as ArrayBufferView
      normalizedBuffer = new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
    } else if (buffer && typeof (buffer as { arrayBuffer?: unknown }).arrayBuffer === 'function') {
      // e.g. Blob-like with arrayBuffer() method
      const ab = await (buffer as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer()
      normalizedBuffer = new Uint8Array(ab)
    } else if (buffer && (buffer as { data?: unknown }).data instanceof Uint8Array) {
      // some buffer-like wrappers expose a `.data` Uint8Array
      normalizedBuffer = (buffer as { data: Uint8Array }).data
    }

    if (!normalizedBuffer) {
      console.error('upload failed: could not normalize uploaded file buffer', typeof buffer)
      return res.status(400).json({ message: 'Unsupported or invalid image file' })
    }

  // ensure we pass a Buffer/Uint8Array to file-type (some runtimes provide odd buffer-like objects)
    // create a Uint8Array view suitable for file-type and sharp
    let detectorInput: Uint8Array
    if (Buffer.isBuffer(normalizedBuffer)) {
      // copy into a plain Uint8Array to avoid passing Buffer subclass objects
      detectorInput = Uint8Array.from(normalizedBuffer as Buffer)
    } else if (ArrayBuffer.isView(normalizedBuffer)) {
      const view = normalizedBuffer as ArrayBufferView
      detectorInput = new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
    } else {
      detectorInput = new Uint8Array(normalizedBuffer as ArrayBuffer)
    }

  const detected = await fileTypeFromBuffer(detectorInput)

    // If file-type detected a mime, ensure it's one of the allowed raster images
    const allowedRaster = ['image/png', 'image/jpeg', 'image/webp']
    if (detected) {
      if (!allowedRaster.includes(detected.mime)) {
        return res.status(400).json({ message: 'Unsupported file content' })
      }
    } else {
      // file-type couldn't detect: reject SVG (we don't accept SVG for now) or unknown formats
      // detect SVG by text heuristics using the normalized buffer
  const asBuffer = Buffer.from(detectorInput)
  const asText = asBuffer.toString('utf8', 0, Math.min(asBuffer.length, 1024)).toLowerCase()
      if (asText.includes('<svg')) {
        return res.status(400).json({ message: 'SVG uploads are not allowed' })
      }
      return res.status(400).json({ message: 'Unsupported or invalid image file' })
    }
    const ext = path.extname(originalname) || (mimetype === 'image/png' ? '.png' : '.jpg')
    const id = crypto.randomBytes(10).toString('hex')
    const filename = `${Date.now()}-${id}${ext}`
  const uploadDir = resolveUploadDir()
  const filepath = path.join(uploadDir, filename)

  // process raster images via sharp (we've already validated types)
  // We will either write the resulting file to disk (default) or upload to S3-compatible storage
  // if S3 environment variables are present.
  let finalBuffer: Buffer
  try {
    const sharpModule = await import('sharp')
    const sharpFn = (sharpModule as any).default ?? sharpModule
    if (typeof sharpFn !== 'function') {
      throw new Error('sharp module missing or invalid')
    }
    const pipeline = sharpFn(Buffer.from(detectorInput))
    if (!pipeline || typeof pipeline.resize !== 'function') {
      throw new Error('sharp returned unexpected pipeline shape')
    }
    // Prefer to write a resized file directly to disk if the object returned by
    // resize() exposes toFile (the test mock uses resize().toFile). Otherwise
    // fall back to toBuffer() on either the resized object or the pipeline.
    const resizeArgs = { width: 1600, withoutEnlargement: true }
    const resized = pipeline.resize(resizeArgs)
    if (resized && typeof (resized as any).toFile === 'function') {
      await (resized as any).toFile(filepath)
      finalBuffer = await fs.readFile(filepath)
    } else if (resized && typeof (resized as any).toBuffer === 'function') {
      finalBuffer = await (resized as any).toBuffer()
    } else if (typeof (pipeline as any).toBuffer === 'function') {
      finalBuffer = await (pipeline as any).resize(resizeArgs).toBuffer()
    } else {
      throw new Error('sharp returned unexpected pipeline shape')
    }
  } catch (e: unknown) {
    // If sharp isn't available or fails, log the error and fall back to using the
    // original uploaded bytes. This keeps uploads working in environments where
    // native sharp isn't present (tests and some CI/Docker platforms).
    console.warn('sharp unavailable or failed to process image; falling back to original buffer:', e)
    finalBuffer = Buffer.from(detectorInput)
  }

  // If S3/MinIO variables are present, upload to S3-compatible storage
  const s3Endpoint = process.env.S3_ENDPOINT
  if (s3Endpoint && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.S3_BUCKET) {
    try {
      const s3Client = new S3Client({
        endpoint: s3Endpoint,
        region: process.env.S3_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' || process.env.S3_FORCE_PATH_STYLE === '1',
      } as any)

      // Put object into the configured bucket
      const key = `uploads/${filename}`
      await s3Client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: finalBuffer, ContentType: detected?.mime ?? mimetype }))

      // persist metadata in DB
      const record = await saveUpload({ key, filename, mimetype: detected?.mime ?? mimetype, size: finalBuffer.length, width: null, height: null })

      // Return canonical photo endpoint which will reference the DB record
      const photoUrl = `/photos/${record.id}`
      return res.json({ url: photoUrl, id: record.id, filename: record.filename, mimetype: record.mimetype })
    } catch (e: unknown) {
      console.error('failed to upload to S3/MinIO', e)
      // fallback to writing to disk below
    }
  }

  // Ensure the upload directory exists before writing (fallback storage)
  await fs.mkdir(path.dirname(filepath), { recursive: true })
  await fs.writeFile(filepath, finalBuffer)

  // persist metadata in DB (for filesystem fallback)
  try {
    const record = await saveUpload({ key: `uploads/${filename}`, filename, mimetype: detected?.mime ?? mimetype, size: finalBuffer.length, width: null, height: null })
    const photoUrl = `/photos/${record.id}`
    return res.json({ url: photoUrl, id: record.id, filename: record.filename, mimetype: record.mimetype })
  } catch (err) {
    console.error('failed to save upload metadata', err)
    // still return the local uploads path as fallback
    const base = process.env.PUBLIC_BASE_URL ?? ''
    const url = base ? `${base.replace(/\/$/, '')}/uploads/${filename}` : `/uploads/${filename}`
    return res.json({ url, filename, mimetype })
  }

    const base = process.env.PUBLIC_BASE_URL ?? ''
    const url = base ? `${base.replace(/\/$/, '')}/uploads/${filename}` : `/uploads/${filename}`

    res.json({ url, filename, mimetype })
  } catch (err: unknown) {
    console.error('upload failed', err)
    res.status(500).json({ message: 'Upload failed' })
  }
}

router.post('/api/uploads', requireAuth, upload.single('file'), uploadHandler)

export { uploadHandler }

export default router

