import { useEffect, useMemo, useState } from 'react'
import { FiArrowLeft } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { useContent } from '../context/ContentContext'
import { BlogList } from '../components/BlogList'

const BlogListPage = () => {
  const { content, loading } = useContent()
  const posts = useMemo(() => content.posts ?? [], [content.posts])
  const visiblePosts = useMemo(
    () => posts.filter((post) => post && post.hidden !== true),
    [posts],
  )

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 10

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  if (loading && visiblePosts.length === 0) {
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
            onClick={() => window.history.back()}
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

        <BlogList
          posts={visiblePosts}
          loading={loading}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          isAdmin={false}
          basePath="/blogs"
          emptyMessage="No blogs are published yet. Check back soon."
        />
      </main>
    </div>
  )
}

export { BlogListPage }
