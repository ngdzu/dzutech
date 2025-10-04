import { useMemo, useState } from 'react'
import { FiArrowLeft, FiEdit2, FiEye, FiEyeOff, FiTrash2 } from 'react-icons/fi'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useContent } from '../context/ContentContext'
import { AdminSessionActions } from '../components/AdminSessionActions'

const AdminBlogDetailPage = () => {
  const { postId = '' } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const { content, deletePost, setPostVisibility } = useContent()
  const [status, setStatus] = useState<'idle' | 'updating' | 'deleting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const post = useMemo(() => {
    const posts = Array.isArray(content.posts) ? content.posts : []
    return posts.find((entry) => entry.id === postId) ?? null
  }, [content.posts, postId])

  const toggleVisibility = async () => {
    if (!post) return
    setStatus('updating')
    setErrorMessage(null)
    try {
      await setPostVisibility(post.id, !post.hidden)
      setStatus('idle')
    } catch (error) {
      console.error('Failed to update post visibility', error)
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update visibility')
    }
  }

  const handleDelete = async () => {
    if (!post) return
    const confirmed = window.confirm('Delete this blog post? This action cannot be undone.')
    if (!confirmed) return
    setStatus('deleting')
    setErrorMessage(null)
    try {
      await deletePost(post.id)
      navigate('/admin/blogs')
    } catch (error) {
      console.error('Failed to delete post', error)
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete post')
    }
  }

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-night-900 px-6 text-center text-slate-300">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-white">Blog post not found</h1>
          <p className="text-sm text-slate-400">
            The blog you're looking for either doesn't exist or was removed.
          </p>
        </div>
        <Link
          to="/admin/blogs"
          className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white"
        >
          <FiArrowLeft />
          Back to blogs
        </Link>
      </div>
    )
  }

  const tags = Array.isArray(post.tags)
    ? post.tags.filter((tag): tag is string => Boolean(tag?.trim()))
    : []

  const actionDisabled = status === 'updating' || status === 'deleting'

  return (
    <div className="min-h-screen bg-night-900 text-slate-100">
      <header className="border-b border-white/5 bg-night-900/80">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 pt-3 pb-6">
          <div className="flex justify-end">
            <AdminSessionActions />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-white"
              >
                <FiArrowLeft />
                Back
              </button>
              <h1 className="text-2xl font-semibold text-white">{post.title}</h1>
              <div className="flex flex-wrap gap-2">
                {post.hidden && (
                  <span className="rounded-full border border-yellow-500/50 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-200">
                    Hidden from public site
                  </span>
                )}
                {status === 'error' && errorMessage && (
                  <span className="rounded-full border border-red-500/70 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-200">
                    {errorMessage}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={toggleVisibility}
                disabled={actionDisabled}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {post.hidden ? <FiEye /> : <FiEyeOff />}
                {post.hidden ? 'Unhide' : 'Hide'}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={actionDisabled}
                className="inline-flex items-center gap-2 rounded-full border border-red-500/60 px-4 py-2 text-sm font-semibold text-red-200 transition hover:border-red-400/70 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiTrash2 />
                Delete
              </button>
              <Link
                to={`/admin/blogs/${post.id}/edit`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white"
              >
                <FiEdit2 className="text-accent-300" />
                Edit
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-slate-300">
            {tags.map((tag) => {
              const trimmed = tag.trim()
              const encoded = encodeURIComponent(trimmed.toLowerCase())
              return (
                <Link
                  key={`${trimmed}-${encoded}`}
                  to={`/admin/blogs/tags/${encoded}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-slate-200 transition hover:border-accent-400 hover:text-white"
                >
                  {trimmed}
                </Link>
              )
            })}
          </div>
        )}

        <article className="rounded-3xl border border-slate-800/80 bg-slate-900/50 p-8 shadow-inner shadow-black/40">
          <div className="whitespace-pre-line text-sm text-slate-300/95">{post.content}</div>
        </article>
      </main>
    </div>
  )
}

export { AdminBlogDetailPage }
