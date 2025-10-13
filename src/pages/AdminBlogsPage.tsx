import type { KeyboardEvent, MouseEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import PaginationControls from '../components/PaginationControls'
import { FiEye, FiEyeOff, FiPlus, FiTrash2 } from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'
import { useContent } from '../context/ContentContext'
import { AdminHeader } from '../components/AdminHeader'
import { markdownExcerpt } from '../lib/markdown'

const cardStyle =
  'space-y-3 rounded-3xl border border-slate-800/80 bg-slate-900/50 p-6 shadow-inner shadow-black/40 transition hover:border-accent-500/50 hover:bg-night-800/70'

const badgeStyle =
  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold'

type ActionState = {
  postId: string
  type: 'hide' | 'show' | 'delete'
}

const getTimestamp = (value?: string | null) => {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

const AdminBlogsPage = () => {
  const navigate = useNavigate()
  const { content, loading, error: contextError, deletePost, setPostVisibility } = useContent()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const posts = useMemo(
    () => (Array.isArray(content.posts) ? content.posts : []),
    [content.posts],
  )
  const [feedback, setFeedback] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)
  const [actionState, setActionState] = useState<ActionState | null>(null)

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      const left = getTimestamp(b.updatedAt ?? b.createdAt)
      const right = getTimestamp(a.updatedAt ?? a.createdAt)
      return left - right
    })
  }, [posts])

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 10
  const totalItems = sortedPosts.length
  const startIndex = (currentPage - 1) * pageSize
  const pagePosts = sortedPosts.slice(startIndex, startIndex + pageSize)

  const handleNavigateToDetail = (postId: string) => () => {
    navigate(`/admin/blogs/${encodeURIComponent(postId)}`)
  }

  const handleKeyNavigate = (postId: string) => (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      navigate(`/admin/blogs/${encodeURIComponent(postId)}`)
    }
  }

  const withControlledAction = async (
    postId: string,
    type: ActionState['type'],
    action: () => Promise<unknown>,
  ) => {
    setActionState({ postId, type })
    setFeedback(null)
    try {
      await action()
      const successMessage =
        type === 'delete'
          ? 'Post deleted successfully'
          : type === 'hide'
            ? 'Post hidden from public site'
            : 'Post is now visible'
      setFeedback({ message: successMessage, tone: 'success' })
    } catch (error) {
      console.error('Blog action failed', error)
      const errorMessage = error instanceof Error ? error.message : 'Action failed'
      setFeedback({ message: errorMessage, tone: 'error' })
    } finally {
      setActionState(null)
    }
  }

  const handleToggleVisibility = async (
    event: MouseEvent<HTMLButtonElement>,
    postId: string,
    hidden: boolean,
  ) => {
    event.stopPropagation()
    await withControlledAction(postId, hidden ? 'hide' : 'show', () => setPostVisibility(postId, hidden))
  }

  const handleDelete = async (event: MouseEvent<HTMLButtonElement>, postId: string) => {
    event.stopPropagation()
    const confirmed = window.confirm('Delete this blog post? This action cannot be undone.')
    if (!confirmed) return
    await withControlledAction(postId, 'delete', () => deletePost(postId))
  }

  const isProcessing = (postId: string, type?: ActionState['type']) => {
    if (!actionState) return false
    if (actionState.postId !== postId) return false
    return typeof type === 'undefined' || actionState.type === type
  }

  const globalStatus = feedback ?? (contextError ? { message: contextError, tone: 'error' as const } : null)

  return (
    <div className="min-h-screen bg-night-900 text-slate-100">
      <AdminHeader />
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 pt-3 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Blog management</h1>
            <p className="text-sm text-slate-400">
              Review existing blog posts, manage visibility, or add new entries.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {loading && (
                <span className={`${badgeStyle} border-slate-700/70 bg-slate-900/70 text-slate-300`}>
                  Loading posts…
                </span>
              )}
              {globalStatus && (
                <span
                  className={`${badgeStyle} ${
                    globalStatus.tone === 'success'
                      ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-200'
                      : 'border-red-500/70 bg-red-500/10 text-red-200'
                  }`}
                >
                  {globalStatus.message}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <Link
              to="/admin/blogs/new"
              className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-4 py-2 text-sm font-semibold text-night-900 shadow-glow transition hover:bg-accent-400"
            >
              <FiPlus />
              Create new blog
            </Link>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,text/markdown"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = e.target.files
                  if (!files || files.length === 0) {
                    setSelectedFiles(null)
                    return
                  }
                  setSelectedFiles(Array.from(files))
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white"
              >
                Upload .md files
              </button>
            </div>
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
        {/* File upload area: show selected files and upload action */}
        {selectedFiles && selectedFiles.length > 0 && (
          <div className="mx-auto w-full max-w-5xl px-6 py-3">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-300">
                  {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                  <div className="mt-2 text-xs text-slate-400">
                    {selectedFiles.slice(0, 10).map((f) => (
                      <div key={f.name}>{f.name}</div>
                    ))}
                    {selectedFiles.length > 10 && <div className="text-xs text-slate-500">and more…</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFiles(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                        if (!selectedFiles || selectedFiles.length === 0) return
                        setUploading(true)
                        setFeedback(null)
                        try {
                          // Send files as multipart/form-data to the new server endpoint
                          const form = new FormData()
                          selectedFiles.forEach((file) => form.append('files', file, file.name))

                          const resp = await fetch('/api/admin/posts/upload', {
                            method: 'POST',
                            credentials: 'include',
                            body: form,
                          })

                          if (!resp.ok) {
                            // try to parse JSON error message
                            const body = await resp.json().catch(() => ({}))
                            const message = body && typeof body.message === 'string' ? body.message : resp.statusText
                            throw new Error(message || 'Upload failed')
                          }

                          const body = await resp.json().catch(() => ({}))
                          const count = (body && (body.count ?? (Array.isArray(body.saved) ? body.saved.length : undefined))) ?? selectedFiles.length
                          setFeedback({ message: `Imported ${count} posts`, tone: 'success' })
                          setSelectedFiles(null)
                          // reset to first page so user sees newest uploaded posts
                          setCurrentPage(1)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        } catch (err) {
                          console.error('Failed to upload MD files', err)
                          setFeedback({ message: (err as Error)?.message ?? 'Upload failed', tone: 'error' })
                        } finally {
                          setUploading(false)
                        }
                      }}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-4 py-2 text-sm font-semibold text-night-900 shadow-glow transition hover:bg-accent-400 disabled:opacity-60"
                  >
                    {uploading ? 'Uploading…' : 'Import selected .md files'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {sortedPosts.length === 0 && !loading ? (
          <div className={`${cardStyle} text-center text-sm text-slate-400`}>
            No blog posts yet. Use the create button above to add your first story.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div />
              <PaginationControls
                totalItems={totalItems}
                pageSize={pageSize}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {pagePosts.map((post) => {
              const tags = Array.isArray(post.tags)
                ? post.tags.filter((tag): tag is string => Boolean(tag?.trim()))
                : []
              const contentPreview = (post.content ?? '').trim()
              const previewText =
                contentPreview.length > 0
                  ? markdownExcerpt(contentPreview, 220)
                  : 'No content provided yet.'

              return (
                <article
                  key={post.id ?? post.title}
                  className={cardStyle}
                >
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 
                            className="cursor-pointer text-lg font-semibold text-white hover:text-accent-400 transition-colors"
                            role="link"
                            tabIndex={0}
                            onClick={handleNavigateToDetail(post.id)}
                            onKeyDown={handleKeyNavigate(post.id)}
                          >
                            {post.title}
                          </h2>
                          {/* Show created date on the tile */}
                          {post.createdAt && (
                            <span className="ml-2 text-xs text-slate-400">{new Date(post.createdAt).toISOString().slice(0, 10)}</span>
                          )}
                          {post.hidden && (
                            <span className={`${badgeStyle} border-yellow-500/60 bg-yellow-500/10 text-yellow-200`}>
                              Hidden
                            </span>
                          )}
                        </div>
                        <p className="whitespace-pre-line text-sm text-slate-300/90">{previewText}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                        {tags.length === 0 ? (
                          <span className="rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1 text-slate-500">
                            No tags assigned
                          </span>
                        ) : (
                          tags.map((tag) => {
                            const trimmed = tag.trim()
                            const encodedTag = encodeURIComponent(trimmed.toLowerCase())
                            return (
                              <Link
                                key={`${trimmed}-${encodedTag}`}
                                to={`/admin/blogs/tags/${encodedTag}`}
                                onClick={(event) => event.stopPropagation()}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-slate-200 transition hover:border-accent-400 hover:text-white"
                              >
                                {trimmed}
                              </Link>
                            )
                          })
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 pt-2">
                        <button
                          type="button"
                          onClick={(event) => handleToggleVisibility(event, post.id, !post.hidden)}
                          disabled={isProcessing(post.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {post.hidden ? <FiEye /> : <FiEyeOff />}
                          {post.hidden ? 'Unhide' : 'Hide'}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => handleDelete(event, post.id)}
                          disabled={isProcessing(post.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-red-500/60 px-3 py-1 text-xs font-semibold text-red-200 transition hover:border-red-400/70 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <FiTrash2 />
                          Delete
                        </button>
                      </div>
                </article>
              )
            })}
          </div>

            <div className="mt-6 flex items-center justify-end">
              <PaginationControls
                totalItems={totalItems}
                pageSize={pageSize}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export { AdminBlogsPage }
