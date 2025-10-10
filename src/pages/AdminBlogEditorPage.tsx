import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { FiArrowLeft, FiSave } from 'react-icons/fi'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useContent } from '../context/ContentContext'
import { AdminSessionActions } from '../components/AdminSessionActions'

const fieldStyle =
  'block w-full rounded-xl border border-slate-800/60 bg-night-800/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30'

const labelStyle = 'text-sm font-medium text-slate-200'

type BlogFormState = {
  title: string
  content: string
  tags: string
  hidden: boolean
}

const EMPTY_POST: BlogFormState = {
  title: '',
  content: '',
  tags: '',
  hidden: false,
}

const normalizeTags = (input: string) =>
  input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const generatePostId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `post-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

import { uploadFile } from '../lib/upload'

const AdminBlogEditorPage = () => {
  const { postId } = useParams<{ postId: string }>()
  const isCreateMode = !postId

  const navigate = useNavigate()
  const { content, updatePosts, loading } = useContent()
  const posts = useMemo(() => content.posts ?? [], [content.posts])
  const [form, setForm] = useState<BlogFormState>(() => ({ ...EMPTY_POST }))
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const currentPost = useMemo(() => {
    if (!postId) return null
    return posts.find((post) => post.id === postId) ?? null
  }, [postId, posts])

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
      content: currentPost.content ?? '',
      tags: Array.isArray(currentPost.tags) ? currentPost.tags.join(', ') : '',
      hidden: currentPost.hidden ?? false,
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

  const handleHiddenToggle = (event: ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target
    setForm((prev) => ({ ...prev, hidden: checked }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('saving')
    setErrorMessage(null)

    const tags = normalizeTags(form.tags)
    const trimmedTitle = form.title.trim()
    const trimmedContent = form.content.trim()

    if (!trimmedTitle || !trimmedContent) {
      setStatus('error')
      setErrorMessage('Title and content are required.')
      return
    }

    const baseId = currentPost?.id ?? generatePostId()
    const createdAt = currentPost?.createdAt ?? new Date().toISOString()
    const nextPost = {
      ...currentPost,
      id: baseId,
      title: trimmedTitle,
      content: trimmedContent,
      tags,
      hidden: form.hidden,
      createdAt,
      updatedAt: new Date().toISOString(),
    }

    const nextPosts = isCreateMode
      ? [...posts, nextPost]
      : posts.map((post) => (post.id === baseId ? { ...post, ...nextPost } : post))

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
    : 'Update the content or tags for this blog post.'

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
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 pt-3 pb-6">
          <div className="flex justify-end">
            <AdminSessionActions />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
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
              <span className={labelStyle}>Content</span>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-md bg-slate-800/60 px-3 py-1 text-sm text-slate-200 hover:bg-slate-700"
                  >
                    Insert image
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        const { url } = await uploadFile(file)
                        // insert markdown at cursor
                        const ta = textareaRef.current
                        const before = ta ? ta.value.slice(0, ta.selectionStart) : form.content
                        const after = ta ? ta.value.slice(ta.selectionEnd) : ''
                        const insertion = `![alt text](${url})\n\n`
                        const nextContent = `${before}${insertion}${after}`
                        setForm((prev) => ({ ...prev, content: nextContent }))
                        // restore focus to textarea
                        ta?.focus()
                      } catch (err) {
                        console.error('Upload failed', err)
                        setErrorMessage(err instanceof Error ? err.message : 'Upload failed')
                      } finally {
                        // clear the input so the same file can be reselected if needed
                        ;(e.target as HTMLInputElement).value = ''
                      }
                    }}
                  />
                </div>
                <textarea
                  ref={textareaRef}
                  className={`${fieldStyle} min-h-[260px]`}
                  value={form.content}
                  onChange={handleChange('content')}
                  placeholder="Write or paste the full blog post content."
                />
              </div>
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
              <span className="text-xs text-slate-500">
                Separate tags with commas. Tags appear as chips on the blog list and power the tag filter page.
              </span>
            </label>
            <label className="flex items-center gap-2 rounded-2xl border border-slate-800/60 bg-slate-900/40 px-4 py-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-600 bg-night-900 text-accent-400 focus:ring-accent-400"
                checked={form.hidden}
                onChange={handleHiddenToggle}
              />
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-slate-200">Hide from public website</span>
                <p className="text-slate-500">
                  When enabled, this post stays visible to admins but is removed from all public listings.
                </p>
              </div>
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
