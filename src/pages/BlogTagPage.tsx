import { useMemo } from 'react'
import { FiArrowLeft } from 'react-icons/fi'
import { Link, useParams } from 'react-router-dom'
import Chip from '../components/Chip'
import { useContent } from '../context/ContentContext'
import { markdownExcerpt } from '../lib/markdown'

const cardStyle =
  'group rounded-3xl border border-slate-800/80 bg-slate-900/40 p-6 transition hover:border-accent-500/40 hover:bg-night-800/70'

const BlogTagPage = () => {
  const { tagSlug = '' } = useParams<{ tagSlug: string }>()
  const decodedTag = useMemo(() => decodeURIComponent(tagSlug), [tagSlug])
  const normalizedTag = decodedTag.trim().toLowerCase()

  const { content } = useContent()
  const posts = useMemo(
    () => (content.posts ?? []).filter((post) => post && post.hidden !== true),
    [content.posts],
  )

  const matching = posts
    .map((post, index) => ({ post, index }))
    .filter(({ post }) =>
      Array.isArray(post.tags)
        ? post.tags.some((tag) => tag?.trim().toLowerCase() === normalizedTag)
        : false,
    )

  const heading = decodedTag ? `Posts tagged “${decodedTag}”` : 'Posts by tag'

  return (
    <div className="min-h-screen bg-night-900 text-slate-100">
      <header className="border-b border-white/5 bg-night-900/80">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-white">{heading}</h1>
            <p className="text-sm text-slate-400">
              {matching.length}{' '}
              {matching.length === 1 ? 'post shares this tag.' : 'posts share this tag.'}
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
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
        {matching.length === 0 ? (
          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
            No posts currently use the tag “{decodedTag}”.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {matching.map(({ post, index }) => {
              const previewText = markdownExcerpt(post.content ?? '', 220)
              const slug = encodeURIComponent((post.id ?? '').trim() || String(index))

              return (
                <article key={post.id ?? `${index}-${post.title}`} className={cardStyle}>
                  <div className="flex h-full flex-col gap-4">
                    <Link
                      to={`/blogs/${slug}`}
                      className="text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
                    >
                      <h2 className="text-lg font-semibold text-white transition-colors group-hover:text-accent-200">
                        {post.title}
                      </h2>
                    </Link>
                    <p className="text-sm text-slate-300/90">
                      {previewText || 'Content coming soon.'}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-2 text-xs text-slate-300/80">
                      {(Array.isArray(post.tags) ? post.tags : []).map((tag) => {
                        const trimmed = String(tag).trim()
                        if (!trimmed) return null
                        const encoded = encodeURIComponent(trimmed.toLowerCase())
                        return (
                          <Chip key={trimmed} to={`/blogs/tags/${encoded}`}>
                            {trimmed}
                          </Chip>
                        )
                      })}
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

export { BlogTagPage }
