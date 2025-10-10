export type UploadResponse = { url: string; filename: string; mimetype: string }

export async function uploadFile(file: File): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch('/api/uploads', {
    method: 'POST',
    body: form,
    credentials: 'include',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Upload failed: ${res.status} ${text}`)
  }

  const payload = await res.json()
  return payload as UploadResponse
}
