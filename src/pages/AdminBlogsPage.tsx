import type { KeyboardEvent, MouseEvent } from 'react'
import { useMemo, useState } from 'react'
import { FiEye, FiEyeOff, FiPlus, FiTrash2 } from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'
import { useContent } from '../context/ContentContext'
import { AdminSessionActions } from '../components/AdminSessionActions'

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
      <header className="border-b border-white/5 bg-night-900/80">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 pt-3 pb-6">
          <div className="flex justify-end">
            <AdminSessionActions />
          </div>
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
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
        {sortedPosts.length === 0 && !loading ? (
          <div className={`${cardStyle} text-center text-sm text-slate-400`}>
            No blog posts yet. Use the create button above to add your first story.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {sortedPosts.map((post) => {
              const tags = Array.isArray(post.tags)
                ? post.tags.filter((tag): tag is string => Boolean(tag?.trim()))
                : []
              const contentPreview = (post.content ?? '').trim()
              const previewText =
                contentPreview.length > 220
                  ? `${contentPreview.slice(0, 220)}…`
                  : contentPreview || 'No content provided yet.'
              const encodedId = encodeURIComponent(post.id ?? '')

              return (
                <article
                  key={post.id ?? post.title}
                  className={cardStyle}
                  role="link"
                  tabIndex={0}
                  onClick={handleNavigateToDetail(post.id)}
                  onKeyDown={handleKeyNavigate(post.id)}
                >
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-white">{post.title}</h2>
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
                        <Link
                          to={`/admin/blogs/${encodedId}`}
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white"
                        >
                          View details
                        </Link>
                      </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export { AdminBlogsPage }
