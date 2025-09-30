import { useEffect, useMemo } from 'react'
import { FiArrowLeft } from 'react-icons/fi'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useContent } from '../context/ContentContext'

const BlogDetailPage = () => {
  const { blogId = '' } = useParams<{ blogId: string }>()
  const navigate = useNavigate()
  const { content, loading } = useContent()
  const posts = content.posts ?? []

  const postIndex = useMemo(() => {
    const parsed = Number.parseInt(blogId, 10)
    return Number.isNaN(parsed) ? -1 : parsed
  }, [blogId])

  const post = postIndex >= 0 && postIndex < posts.length ? posts[postIndex] : null

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [postIndex])

  if (loading && !post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-night-900 px-6 text-center text-slate-300">
        <p className="text-sm text-slate-400">Loading blog…</p>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-night-900 px-6 text-center text-slate-300">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-white">Blog post not found</h1>
          <p className="text-sm text-slate-400">
            The blog you're looking for either doesn't exist or is no longer available.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white"
        >
          <FiArrowLeft />
          Back to home
        </Link>
      </div>
    )
  }

  const tags = Array.isArray(post.tags)
    ? post.tags.filter((tag): tag is string => Boolean(tag?.trim()))
    : []

  return (
    <div className="min-h-screen bg-night-900 text-slate-100">
      <header className="border-b border-white/5 bg-night-900/80">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-white"
          >
            <FiArrowLeft />
            Back
          </button>
          <Link
            to="/#writing"
            className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white"
          >
            Writing
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold text-white">{post.title}</h1>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs text-slate-300">
              {tags.map((tag) => {
                const trimmed = tag.trim()
                const encoded = encodeURIComponent(trimmed.toLowerCase())
                return (
                  <Link
                    key={trimmed}
                    to={`/blogs/tags/${encoded}`}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-slate-200 transition hover:border-accent-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
                  >
                    {trimmed}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <article className="rounded-3xl border border-slate-800/80 bg-slate-900/50 p-8 shadow-inner shadow-black/40">
          <div className="whitespace-pre-line text-base leading-relaxed text-slate-200">{post.content}</div>
        </article>
      </main>
    </div>
  )
}

export { BlogDetailPage }
