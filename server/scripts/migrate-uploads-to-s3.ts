/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs/promises'
import path from 'path'
import { S3Client, PutObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3'

async function main() {
  const uploadDir = path.resolve(process.cwd(), 'uploads')
  const s3Endpoint = process.env.S3_ENDPOINT
  const bucket = process.env.S3_BUCKET
  if (!s3Endpoint || !bucket || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('S3/MinIO environment variables are not set; aborting migration')
    process.exit(1)
  }

  const s3 = new S3Client({ endpoint: s3Endpoint, region: process.env.S3_REGION || 'us-east-1', credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! }, forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' } as any)

  // ensure bucket exists
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }))
    console.log('bucket exists:', bucket)
  } catch (err) {
    console.log('creating bucket:', bucket, err)
    await s3.send(new CreateBucketCommand({ Bucket: bucket }))
  }

  let files: string[] = []
  try {
    const dir = await fs.readdir(uploadDir)
    files = dir.filter((f) => !f.startsWith('.'))
  } catch (e) {
    console.error('no uploads directory found or read error', e)
    process.exit(1)
  }

  for (const file of files) {
    const full = path.join(uploadDir, file)
    const stat = await fs.stat(full)
    if (!stat.isFile()) continue
    const body = await fs.readFile(full)
    const key = `uploads/${file}`
    console.log('uploading', file, '->', key)
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }))
  }

  console.log('migration complete')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
