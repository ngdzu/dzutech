/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react'
import { AdminSessionActions } from '../components/AdminSessionActions'

type UploadRecord = {
  id: string
  key: string
  filename: string | null
  mimetype: string | null
  size: number | null
  created_at: string | null
}

const AdminUploadsPage = () => {
  const [uploads, setUploads] = useState<UploadRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetch('/api/admin/uploads?limit=200')
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      })
      .then((data) => {
        if (!mounted) return
        setUploads(Array.isArray(data.uploads) ? data.uploads : [])
      })
      .catch((err) => {
        console.error('Failed to fetch uploads', err)
        if (mounted) setError(String(err?.message ?? err))
      })
      .finally(() => mounted && setLoading(false))

    return () => {
      mounted = false
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0]
    if (f) setSelectedFileName(f.name)
    else setSelectedFileName(null)
  }

  const doUpload = async () => {
    const el = fileInputRef.current
    if (!el || !el.files || el.files.length === 0) {
      return alert('Please choose a file to upload')
    }
    const file = el.files[0]
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const resp = await fetch('/api/uploads', { method: 'POST', body: fd })
      if (!resp.ok) {
        const txt = await resp.text()
        throw new Error(txt || resp.statusText)
      }
      const data = await resp.json()
      // The API returns { id, url, filename, mimetype }
      // Refresh list by prepending the new item (or re-fetch fully if you prefer)
      const newItem: UploadRecord = {
        id: data.id,
        key: data.key ?? `uploads/${data.filename ?? ''}`,
        filename: data.filename ?? file.name,
        mimetype: (data.mimetype ?? file.type) || null,
        size: data.size ?? file.size ?? null,
        created_at: new Date().toISOString(),
      }
      setUploads((s) => [newItem, ...s])
      // clear file input
      el.value = ''
      setSelectedFileName(null)
    } catch (err) {
      console.error('Upload failed', err)
      setError(String((err as Error).message || err))
    } finally {
      setUploading(false)
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // small feedback could be added later
    } catch (err) {
      console.error('copy failed', err)
      void alert('Unable to copy to clipboard — your browser may block it.')
    }
  }

  const copyMarkdown = (id: string) => {
    const md = `![](/photos/${id})`
    void copy(md)
  }

  return (
    <div className="min-h-screen bg-night-900 text-slate-100">
      <header className="border-b border-white/5 bg-night-900/80">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <div className="flex justify-end">
            <AdminSessionActions />
          </div>
          <div className="mt-4">
            <h1 className="text-2xl font-semibold text-white">Uploaded photos</h1>
            <p className="text-sm text-slate-400">List of uploaded photos. Copy the ID to embed into markdown.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-3 py-1 text-sm text-slate-200">
            <input ref={fileInputRef} onChange={handleFileSelect} type="file" accept="image/*" className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm font-medium"
            >
              Choose file
            </button>
            <span className="text-xs text-slate-400">{selectedFileName ?? 'No file chosen'}</span>
          </label>
          <button
            type="button"
            onClick={doUpload}
            disabled={uploading}
            className="rounded-full bg-accent-500 px-3 py-1 text-xs font-semibold text-night-900 shadow-glow disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : 'Upload photo'}
          </button>
        </div>

        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="mt-4 overflow-x-auto rounded-md border border-slate-800/80 bg-slate-900/50 p-4">
          <table className="w-full table-auto text-sm">
            <thead>
              <tr className="text-left text-slate-300">
                <th className="px-2 py-2">Preview</th>
                <th className="px-2 py-2">Filename</th>
                <th className="px-2 py-2">Size</th>
                <th className="px-2 py-2">Created</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
                      {uploads.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-slate-400">
                    No uploads yet.
                  </td>
                </tr>
              ) : (
                uploads.map((u) => (
                  <tr key={u.id} className="border-t border-slate-800/60">
                    <td className="px-2 py-3 align-middle">
                      {u.key ? (
                        <img
                          src={
                            // prefer a presigned URL when provided by the API; otherwise fall back to /uploads proxy
                            (u as any).presignedUrl
                              ? (u as any).presignedUrl
                              : `/uploads/${encodeURIComponent(
                                // prefer filename if present, otherwise derive from key
                                (u.filename ?? u.key.replace(/^uploads\//, '')) as string,
                              )}`
                          }
                          alt={u.filename ?? ''}
                          className="h-12 w-12 rounded object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded bg-slate-800/60" />
                      )}
                    </td>
                    <td className="px-2 py-3 align-middle text-slate-200">{u.filename ?? u.key}</td>
                    <td className="px-2 py-3 align-middle text-slate-400">{u.size ?? '-'}</td>
                    <td className="px-2 py-3 align-middle text-slate-400">{u.created_at ?? '-'}</td>
                    <td className="px-2 py-3 align-middle">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => copy(u.id)}
                          className="rounded-full border border-slate-700/70 px-3 py-1 text-xs font-semibold text-slate-200"
                        >
                          Copy ID
                        </button>
                        <button
                          type="button"
                          onClick={() => copyMarkdown(u.id)}
                          className="rounded-full border border-slate-700/70 px-3 py-1 text-xs font-semibold text-slate-200"
                        >
                          Copy Markdown
                        </button>
                        <a
                          href={(u as any).presignedUrl ? (u as any).presignedUrl : `/uploads/${encodeURIComponent(
                            (u.filename ?? u.key.replace(/^uploads\//, '')) as string,
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-slate-700/70 px-3 py-1 text-xs font-semibold text-slate-200"
                        >
                          Open
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}

export { AdminUploadsPage }
