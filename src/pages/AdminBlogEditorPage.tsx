import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { FiArrowLeft, FiSave } from 'react-icons/fi'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useContent } from '../context/ContentContext'

const fieldStyle =
  'block w-full rounded-xl border border-slate-800/60 bg-night-800/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30'

const labelStyle = 'text-sm font-medium text-slate-200'

type BlogFormState = {
  title: string
  href: string
  summary: string
  tags: string
}

const EMPTY_POST: BlogFormState = {
  title: '',
  href: '',
  summary: '',
  tags: '',
}

const normalizeTags = (input: string) =>
  input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const AdminBlogEditorPage = () => {
  const { blogId } = useParams<{ blogId: string }>()
  const isCreateMode = !blogId
  const index = useMemo(() => {
    if (!blogId) return null
    const parsed = Number.parseInt(blogId, 10)
    return Number.isNaN(parsed) ? null : parsed
  }, [blogId])

  const navigate = useNavigate()
  const { content, updatePosts, loading } = useContent()
  const posts = content.posts ?? []
  const [form, setForm] = useState<BlogFormState>(() => ({ ...EMPTY_POST }))
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const currentPost = useMemo(() => {
    if (isCreateMode) return null
    if (index === null || index < 0 || index >= posts.length) return null
    return posts[index]
  }, [isCreateMode, index, posts])

  useEffect(() => {
    if (isCreateMode) {
      setForm({ ...EMPTY_POST })
      return
    }

    if (!currentPost) {
      setErrorMessage('We could not find the blog post you are trying to edit.')
      return
    }

    setForm({
      title: currentPost.title ?? '',
      href: currentPost.href ?? '',
      summary: currentPost.summary ?? '',
      tags: Array.isArray(currentPost.tags) ? currentPost.tags.join(', ') : '',
    })
  }, [isCreateMode, currentPost])

  useEffect(() => {
    if (status !== 'saved') return

    const timer = window.setTimeout(() => setStatus('idle'), 2500)
    return () => window.clearTimeout(timer)
  }, [status])

  const handleChange = (field: keyof BlogFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value
      setForm((prev) => ({ ...prev, [field]: value }))
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('saving')
    setErrorMessage(null)

    const tags = normalizeTags(form.tags)
    const trimmedTitle = form.title.trim()
    const trimmedHref = form.href.trim()
    const trimmedSummary = form.summary.trim()

    if (!trimmedTitle || !trimmedHref) {
      setStatus('error')
      setErrorMessage('Title and URL are required.')
      return
    }

    const nextPost = {
      title: trimmedTitle,
      href: trimmedHref,
      summary: trimmedSummary,
      tags,
    }

    const nextPosts = isCreateMode
      ? [...posts, nextPost]
      : posts.map((post, idx) => (idx === index ? nextPost : post))

    try {
      await updatePosts(nextPosts)
      setStatus('saved')
      navigate('/admin/blogs')
    } catch (saveError) {
      console.error('Unable to save blog post', saveError)
      setStatus('error')
      setErrorMessage(saveError instanceof Error ? saveError.message : 'Unable to save blog post')
    }
  }

  const saving = status === 'saving'

  const title = isCreateMode ? 'Create new blog post' : 'Edit blog post'
  const helper = isCreateMode
    ? 'Publish a new story to showcase your latest thinking.'
    : 'Update the content, URL, or tags for this blog post.'

  if (!isCreateMode && !currentPost && !loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-night-900 px-6 text-slate-100">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-xl font-semibold text-white">Blog post not found</h1>
          <p className="text-sm text-slate-400">
            We looked everywhere but couldn’t locate that entry. It might have been removed or the link is invalid.
          </p>
          <Link
            to="/admin/blogs"
            className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-4 py-2 text-sm font-semibold text-night-900 shadow-glow transition hover:bg-accent-400"
          >
            Back to blog management
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-night-900 text-slate-100">
      <header className="border-b border-white/5 bg-night-900/80">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">{title}</h1>
            <p className="text-sm text-slate-400">{helper}</p>
          </div>
          <Link
            to="/admin/blogs"
            className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white"
          >
            <FiArrowLeft />
            Back to list
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6">
          <div className="space-y-2">
            <label className="flex flex-col gap-2">
              <span className={labelStyle}>Title</span>
              <input
                type="text"
                className={fieldStyle}
                value={form.title}
                onChange={handleChange('title')}
                placeholder="Introducing resilient frontend architectures"
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelStyle}>Canonical URL</span>
              <input
                type="url"
                className={fieldStyle}
                value={form.href}
                onChange={handleChange('href')}
                placeholder="https://blog.example.com/shipping-fast"
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelStyle}>Summary</span>
              <textarea
                className={`${fieldStyle} min-h-[160px]`}
                value={form.summary}
                onChange={handleChange('summary')}
                placeholder="Share the key lesson or teaser for this blog post."
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelStyle}>Tags</span>
              <input
                type="text"
                className={fieldStyle}
                value={form.tags}
                onChange={handleChange('tags')}
                placeholder="Engineering, Leadership, Case study"
              />
              <span className="text-xs text-slate-500">Separate tags with commas.</span>
            </label>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-800/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-slate-500">
              {status === 'saved' ? 'Saved! Redirecting back to the list…' : 'Changes apply immediately after saving.'}
            </span>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/admin/blogs"
                className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-5 py-2 text-sm font-semibold text-night-900 shadow-glow transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiSave />
                {isCreateMode ? 'Create blog' : 'Save changes'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}

export { AdminBlogEditorPage }
