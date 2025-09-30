import { FiEdit2, FiPlus } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { useContent } from '../context/ContentContext'

const cardStyle =
  'space-y-3 rounded-3xl border border-slate-800/80 bg-slate-900/50 p-6 shadow-inner shadow-black/40'

const AdminBlogsPage = () => {
  const { content } = useContent()
  const posts = content.posts ?? []

  return (
    <div className="min-h-screen bg-night-900 text-slate-100">
      <header className="border-b border-white/5 bg-night-900/80">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">Blog management</h1>
            <p className="text-sm text-slate-400">
              Review existing blog posts, edit content, or add new entries.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
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
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
        {posts.length === 0 ? (
          <div className={`${cardStyle} text-center text-sm text-slate-400`}>
            No blog posts yet. Use the create button above to add your first story.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {posts.map((post, index) => {
              const tagLine = Array.isArray(post.tags) && post.tags.length > 0 ? post.tags.join(' · ') : '—'

              return (
                <article key={post.href || `${index}-${post.title}`} className={cardStyle}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{post.title}</h2>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{tagLine}</p>
                  </div>
                  <Link
                    to={`/admin/blogs/${index}/edit`}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white"
                  >
                    <FiEdit2 className="text-accent-300" />
                    Edit
                  </Link>
                </div>
                <p className="text-sm text-slate-300/90">{post.summary || 'No summary provided yet.'}</p>
                <div className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">URL:</span>{' '}
                  {post.href || '—'}
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
