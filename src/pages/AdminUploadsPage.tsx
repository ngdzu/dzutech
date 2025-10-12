/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react'
import { FiTrash2, FiUpload } from 'react-icons/fi'
import { AdminHeader } from '../components/AdminHeader'
import { ImagePreviewModal } from '../components/ImagePreviewModal'
import { ImageUploaderModal } from '../components/ImageUploaderModal'

type UploadRecord = {
  id: string
  key: string
  filename: string | null
  mimetype: string | null
  size: number | null
  created_at: string | null
}

const formatFileSize = (bytes: number | null): string => {
  if (bytes === null || bytes === 0) return '-'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

const formatDate = (dateString: string | null): { short: string; full: string } => {
  if (!dateString) return { short: '-', full: '' }

  const date = new Date(dateString)
  const short = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit'
  })
  const full = date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  return { short, full }
}

const AdminUploadsPage = () => {
  const [uploads, setUploads] = useState<UploadRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; filename: string | null } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean
    imageUrl: string
    imageAlt: string
    markdownLink: string
  } | null>(null)
  const [copiedUploadId, setCopiedUploadId] = useState<string | null>(null)
  const [uploaderModalOpen, setUploaderModalOpen] = useState(false)

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

  const copy = async (text: string) => {
    try {
      // Try modern Clipboard API first
      await navigator.clipboard.writeText(text)
      // small feedback could be added later
    } catch (err) {
      console.error('Modern clipboard API failed, trying fallback', err)
      try {
        // Fallback for older browsers or when Clipboard API is blocked
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)

        if (!successful) {
          throw new Error('Fallback copy method also failed')
        }
      } catch (fallbackErr) {
        console.error('Fallback copy failed', fallbackErr)
        void alert('Unable to copy to clipboard — your browser may block it.')
      }
    }
  }

  const copyMarkdown = (id: string) => {
    const md = `![](/photos/${id})`
    void copy(md)
    setCopiedUploadId(id)
    setTimeout(() => setCopiedUploadId(null), 2000)
  }

  const openPreview = (upload: UploadRecord) => {
    const imageUrl = (upload as any).presignedUrl
      ? (upload as any).presignedUrl
      : `/uploads/${encodeURIComponent((upload.filename ?? upload.key.replace(/^uploads\//, '')) as string)}`

    setPreviewModal({
      isOpen: true,
      imageUrl,
      imageAlt: upload.filename ?? '',
      markdownLink: `![](/photos/${upload.id})`
    })
  }

  const closePreview = () => {
    setPreviewModal(null)
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    setError(null)
    try {
      const resp = await fetch(`/api/admin/uploads/${id}`, { method: 'DELETE' })
      if (!resp.ok) {
        const txt = await resp.text()
        throw new Error(txt || resp.statusText)
      }
      // Remove from local state
      setUploads((s) => s.filter((u) => u.id !== id))
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Delete failed', err)
      setError(String((err as Error).message || err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-night-900 text-slate-100">
      <AdminHeader />
      <div className="mx-auto max-w-5xl px-6 py-5">
        <div>
          <h1 className="text-2xl font-semibold text-white">Uploaded photos</h1>
          <p className="text-sm text-slate-400">List of uploaded photos. Copy the ID to embed into markdown.</p>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setUploaderModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-4 py-2 text-sm font-semibold text-night-900 shadow-glow hover:bg-accent-400"
          >
            <FiUpload />
            Upload new photo
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
                          className="h-12 w-12 cursor-pointer rounded object-cover transition hover:opacity-80"
                          onClick={() => openPreview(u)}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded bg-slate-800/60" />
                      )}
                    </td>
                    <td className="px-2 py-3 align-middle text-slate-200">{u.filename ?? u.key}</td>
                    <td className="px-2 py-3 align-middle text-slate-400">{formatFileSize(u.size)}</td>
                    <td className="px-2 py-3 align-middle text-slate-400">
                      <span title={formatDate(u.created_at).full}>
                        {formatDate(u.created_at).short}
                      </span>
                    </td>
                    <td className="px-2 py-3 align-middle">
                      <div className="flex gap-2">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => copyMarkdown(u.id)}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white"
                          >
                            Copy Markdown
                          </button>
                          {copiedUploadId === u.id && (
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-slate-700 px-2 py-1 text-xs text-slate-200 shadow-lg animate-fade-out">
                              Copied!
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm({ id: u.id, filename: u.filename })}
                          className="inline-flex items-center gap-2 rounded-full border border-red-500/60 px-3 py-1 text-xs font-semibold text-red-200 transition hover:border-red-400/70 hover:text-red-100"
                        >
                          <FiTrash2 />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-w-md rounded-lg border border-slate-700/70 bg-slate-900 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white">Delete Upload</h3>
            <p className="mt-2 text-sm text-slate-300">
              Are you sure you want to delete "{deleteConfirm.filename ?? 'this upload'}"? This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 rounded-full border border-slate-700/70 px-4 py-2 text-sm font-semibold text-slate-200 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm.id)}
                disabled={deleting}
                className="flex-1 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-red-700"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image preview modal */}
      {previewModal && (
        <ImagePreviewModal
          isOpen={previewModal.isOpen}
          imageUrl={previewModal.imageUrl}
          imageAlt={previewModal.imageAlt}
          markdownLink={previewModal.markdownLink}
          onClose={closePreview}
        />
      )}

      {/* Image uploader modal */}
      <ImageUploaderModal
        isOpen={uploaderModalOpen}
        onClose={() => setUploaderModalOpen(false)}
      />
    </div>
  )
}

export { AdminUploadsPage }
