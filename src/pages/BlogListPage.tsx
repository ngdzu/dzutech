import { useEffect, useMemo } from 'react'
import { FiArrowLeft } from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'
import Chip from '../components/Chip'
import { useContent } from '../context/ContentContext'
import { markdownExcerpt } from '../lib/markdown'

const BlogListPage = () => {
  const navigate = useNavigate()
  const { content, loading } = useContent()
  const posts = useMemo(() => content.posts ?? [], [content.posts])
  const visiblePosts = useMemo(
    () => posts.filter((post) => post && post.hidden !== true),
    [posts],
  )

  const sortedPosts = useMemo(() => {
    const parseTimestamp = (value: string | undefined): number | null => {
      if (typeof value !== 'string') return null
      const parsed = Date.parse(value)
      return Number.isNaN(parsed) ? null : parsed
    }

    return visiblePosts
      .map((post, index) => {
        const datedPost = post as typeof post & { updatedAt?: string; createdAt?: string }
        const updatedAt = parseTimestamp(datedPost.updatedAt)
        const createdAt = parseTimestamp(datedPost.createdAt)
        const timestamp = updatedAt ?? createdAt ?? null
        return { post, index, timestamp }
      })
      .sort((a, b) => {
        if (a.timestamp == null && b.timestamp == null) {
          return a.index - b.index
        }
        if (a.timestamp == null) return 1
        if (b.timestamp == null) return -1
        return b.timestamp - a.timestamp
      })
  }, [visiblePosts])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  if (loading && sortedPosts.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-night-900 px-6 text-center text-slate-300">
        <p className="text-sm text-slate-400">Loading blogs…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-night-900 text-slate-100">
      <header className="border-b border-white/5 bg-night-900/80">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-white"
          >
            <FiArrowLeft />
            Back
          </button>
          <Link
            to="/#blogs"
            className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white"
          >
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-semibold text-white">All blog posts</h1>
          <p className="text-sm text-slate-400">
            Dive into every article, from in-depth architecture walkthroughs to practical delivery tips.
          </p>
        </div>

        {sortedPosts.length === 0 ? (
          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/40 px-6 py-12 text-center text-sm text-slate-300/80">
            No blogs are published yet. Check back soon.
          </div>
        ) : (
          <div className="grid gap-6">
            {sortedPosts.map(({ post, index }) => {
              const previewText = markdownExcerpt(post.content ?? '', 220)
              const slug = encodeURIComponent((post.id ?? '').trim() || String(index))

              const tags = Array.isArray(post.tags)
                ? post.tags.filter((tag): tag is string => Boolean(tag?.trim()))
                : []

              return (
                <article
                  key={post.id ?? `${post.title}-${index}`}
                  className="group rounded-3xl border border-slate-800/60 bg-slate-900/40 p-8 transition hover:border-accent-500/40 hover:bg-night-800/80"
                >
                  <div className="flex flex-col gap-4">
                    <h2 className="text-2xl font-semibold text-white transition group-hover:text-accent-200">
                      <Link
                        to={`/blogs/${slug}`}
                        className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
                      >
                        {post.title}
                      </Link>
                    </h2>
                    <p className="text-base text-slate-300/85">
                      {previewText || 'Content coming soon.'}
                    </p>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-xs text-slate-300/80">
                        {tags.map((tag) => {
                          const trimmed = tag.trim()
                          const encoded = encodeURIComponent(trimmed.toLowerCase())
                          return (
                            <Chip key={trimmed} to={`/blogs/tags/${encoded}`}>
                              {trimmed}
                            </Chip>
                          )
                        })}
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Link
                        to={`/blogs/${slug}`}
                        className="text-sm font-semibold text-accent-200 transition hover:text-accent-100"
                      >
                        Read post →
                      </Link>
                    </div>
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

export { BlogListPage }
