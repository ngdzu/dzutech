import { FiArrowLeft } from 'react-icons/fi'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useContent } from '../context/ContentContext'

const chipStyle =
  'inline-flex w-fit items-center gap-2 rounded-3xl border border-slate-800/70 bg-slate-900/60 px-6 py-4'

const AdminBlogsByTagPage = () => {
  const { tagSlug = '' } = useParams<{ tagSlug: string }>()
  const decodedTag = decodeURIComponent(tagSlug)
  const normalizedTag = decodedTag.trim().toLowerCase()

  const { content } = useContent()
  const navigate = useNavigate()
  const posts = content.posts ?? []

  const matchingPosts = posts
    .map((post, index) => ({ post, index }))
    .filter(({ post }) => {
      if (!Array.isArray(post.tags)) return false
      return post.tags.some((tag) => tag?.trim().toLowerCase() === normalizedTag)
    })

  const heading = decodedTag ? `Blogs tagged “${decodedTag}”` : 'Blogs by tag'

  return (
    <div className="min-h-screen bg-night-900 text-slate-100">
      <header className="border-b border-white/5 bg-night-900/80">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">{heading}</h1>
            <p className="text-sm text-slate-400">
              {matchingPosts.length} {matchingPosts.length === 1 ? 'blog post found' : 'blog posts found'} with this tag.
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
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
        {matchingPosts.length === 0 ? (
          <div className={`${chipStyle} text-center text-sm text-slate-400`}>
            No blog posts currently use the tag “{decodedTag}”.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {matchingPosts.map(({ post, index }) => {
              const contentPreview = (post.content ?? '').trim()
              const previewText = contentPreview.length > 220 ? `${contentPreview.slice(0, 220)}…` : contentPreview || 'No content provided yet.'
              return (
                <article
                  key={`${index}-${post.title}`}
                  className="space-y-4 rounded-3xl border border-slate-800/80 bg-slate-900/50 p-6 shadow-inner shadow-black/40"
                >
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-white">{post.title}</h2>
                    <p className="text-sm text-slate-300/90 whitespace-pre-line">{previewText}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                    {(Array.isArray(post.tags) ? post.tags : []).map((tag) => {
                      const trimmed = tag?.trim()
                      if (!trimmed) return null
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
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/blogs/${index}`)}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-accent-300 transition hover:text-accent-200"
                  >
                    View post
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export { AdminBlogsByTagPage }
