import type { KeyboardEvent, MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PaginationControls from './PaginationControls'
import { FiEye, FiEyeOff, FiTrash2 } from 'react-icons/fi'
import { markdownExcerpt } from '../lib/markdown'

const cardStyle =
  'space-y-3 rounded-3xl border border-slate-800/80 bg-slate-900/50 p-6 shadow-inner shadow-black/40 transition hover:border-accent-500/50 hover:bg-night-800/70'

const badgeStyle =
  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold'

type ActionState = {
  postId: string
  type: 'hide' | 'show' | 'delete'
}

type BlogPost = {
  id: string
  title: string
  content?: string
  tags?: string[]
  createdAt?: string
  updatedAt?: string
  hidden?: boolean
}

type BlogListProps = {
  posts: BlogPost[]
  loading?: boolean
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  isAdmin?: boolean
  onToggleVisibility?: (postId: string, hidden: boolean) => Promise<void>
  onDelete?: (postId: string) => Promise<void>
  actionState?: ActionState | null
  basePath?: string
  emptyMessage?: string
}

const getTimestamp = (value?: string | null) => {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

const isProcessing = (postId: string, actionState: ActionState | null | undefined, type?: ActionState['type']) => {
  if (!actionState) return false
  if (actionState.postId !== postId) return false
  return typeof type === 'undefined' || actionState.type === type
}

export const BlogList = ({
  posts,
  loading = false,
  currentPage,
  pageSize,
  onPageChange,
  isAdmin = false,
  onToggleVisibility,
  onDelete,
  actionState,
  basePath = '/blogs',
  emptyMessage = 'No blog posts yet.',
}: BlogListProps) => {
  const navigate = useNavigate()

  const sortedPosts = posts.sort((a, b) => {
    const left = getTimestamp(b.updatedAt ?? b.createdAt)
    const right = getTimestamp(a.updatedAt ?? a.createdAt)
    return left - right
  })

  const totalItems = sortedPosts.length
  const startIndex = (currentPage - 1) * pageSize
  const pagePosts = sortedPosts.slice(startIndex, startIndex + pageSize)

  const handleNavigateToDetail = (postId: string) => () => {
    const path = isAdmin ? `/admin/blogs/${encodeURIComponent(postId)}` : `${basePath}/${encodeURIComponent(postId)}`
    navigate(path)
  }

  const handleKeyNavigate = (postId: string) => (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleNavigateToDetail(postId)()
    }
  }

  const handleToggleVisibility = async (event: MouseEvent<HTMLButtonElement>, postId: string, hidden: boolean) => {
    event.stopPropagation()
    if (onToggleVisibility) {
      await onToggleVisibility(postId, hidden)
    }
  }

  const handleDelete = async (event: MouseEvent<HTMLButtonElement>, postId: string) => {
    event.stopPropagation()
    const confirmed = window.confirm('Delete this blog post? This action cannot be undone.')
    if (!confirmed) return
    if (onDelete) {
      await onDelete(postId)
    }
  }

  if (sortedPosts.length === 0 && !loading) {
    return (
      <div className={`${cardStyle} text-center text-sm text-slate-400`}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div />
        <PaginationControls
          totalItems={totalItems}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={onPageChange}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {pagePosts.map((post) => {
          const tags = Array.isArray(post.tags)
            ? post.tags.filter((tag): tag is string => Boolean(tag?.trim()))
            : []
          const contentPreview = (post.content ?? '').trim()
          const previewText =
            contentPreview.length > 0
              ? markdownExcerpt(contentPreview, 220)
              : 'No content provided yet.'

          return (
            <article
              key={post.id ?? post.title}
              className={cardStyle}
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    className="cursor-pointer text-lg font-semibold text-white hover:text-accent-400 transition-colors"
                    role="link"
                    tabIndex={0}
                    onClick={handleNavigateToDetail(post.id)}
                    onKeyDown={handleKeyNavigate(post.id)}
                  >
                    {post.title}
                  </h2>
                  {/* Show created date on the tile */}
                  {post.createdAt && (
                    <span className="ml-2 text-xs text-slate-400">{new Date(post.createdAt).toISOString().slice(0, 10)}</span>
                  )}
                  {isAdmin && post.hidden && (
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
                    const tagPath = isAdmin ? `/admin/blogs/tags/${encodedTag}` : `${basePath}/tags/${encodedTag}`
                    return (
                      <Link
                        key={`${trimmed}-${encodedTag}`}
                        to={tagPath}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-slate-200 transition hover:border-accent-400 hover:text-white"
                      >
                        {trimmed}
                      </Link>
                    )
                  })
                )}
              </div>
              {isAdmin && (
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={(event) => handleToggleVisibility(event, post.id, !post.hidden)}
                    disabled={isProcessing(post.id, actionState)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-accent-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {post.hidden ? <FiEye /> : <FiEyeOff />}
                    {post.hidden ? 'Unhide' : 'Hide'}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => handleDelete(event, post.id)}
                    disabled={isProcessing(post.id, actionState)}
                    className="inline-flex items-center gap-2 rounded-full border border-red-500/60 px-3 py-1 text-xs font-semibold text-red-200 transition hover:border-red-400/70 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiTrash2 />
                    Delete
                  </button>
                </div>
              )}
            </article>
          )
        })}
      </div>

      <div className="mt-6 flex items-center justify-end">
        <PaginationControls
          totalItems={totalItems}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={onPageChange}
        />
      </div>
    </>
  )
}