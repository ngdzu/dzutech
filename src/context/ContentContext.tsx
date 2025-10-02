import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { ContentState, Experience, Post, Profile, SectionsContent, SiteMeta, Tutorial } from '../content'
import { defaultContent } from '../content'
import { renderMarkdown } from '../lib/markdown'
import {
  fetchContent as fetchContentFromApi,
  resetContent as resetContentOnServer,
  updateExperiences as updateExperiencesOnServer,
  updatePosts as updatePostsOnServer,
  updateProfile as updateProfileOnServer,
  updateSections as updateSectionsOnServer,
  updateSite as updateSiteOnServer,
  updateTutorials as updateTutorialsOnServer,
} from '../lib/api'

type ContentContextValue = {
  content: ContentState
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  updateSite: (site: SiteMeta) => Promise<SiteMeta>
  updateProfile: (updates: Partial<Profile>) => Promise<Profile>
  updatePosts: (posts: Post[]) => Promise<Post[]>
  updateExperiences: (experiences: Experience[]) => Promise<Experience[]>
  updateTutorials: (tutorials: Tutorial[]) => Promise<Tutorial[]>
  updateSections: (sections: SectionsContent) => Promise<SectionsContent>
  resetContent: () => Promise<ContentState>
}

const ContentContext = createContext<ContentContextValue | undefined>(undefined)

const computePostHtml = (posts: Post[] | undefined): Post[] =>
  Array.isArray(posts)
    ? posts.map((post) => ({
        ...post,
        contentHtml:
          typeof post.contentHtml === 'string' && post.contentHtml.trim().length > 0
            ? post.contentHtml
            : renderMarkdown(post.content ?? ''),
      }))
    : []

const cloneContent = (): ContentState => {
  const snapshot = JSON.parse(JSON.stringify(defaultContent)) as ContentState
  snapshot.posts = computePostHtml(snapshot.posts)
  return snapshot
}

export const ContentProvider = ({ children }: { children: ReactNode }) => {
  const [content, setContent] = useState<ContentState>(() => cloneContent())
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchContentFromApi()
      setContent({
        ...data,
        posts: computePostHtml(data.posts),
      })
      setError(null)
    } catch (refreshError) {
      console.error('Failed to load content from API', refreshError)
      setContent(cloneContent())
      setError(refreshError instanceof Error ? refreshError.message : 'Failed to load content')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (typeof document === 'undefined') return

    const siteTitle = content.site?.title?.trim()
    const name = content.profile?.name?.trim()
    const role = content.profile?.title?.trim()
    const computedTitle = siteTitle || [name, role].filter(Boolean).join(' · ') || 'Personal Portfolio'

    if (document.title !== computedTitle) {
      document.title = computedTitle
    }

    const siteDescription = content.site?.description?.trim()
    const summary = content.profile?.summary?.trim()
    const contactDescription = content.sections?.contact?.description?.trim()
    const fallbackDescription = 'Portfolio website showcasing software engineering work, projects, and contact details.'
    const computedDescription = siteDescription || summary || contactDescription || fallbackDescription

    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription && metaDescription.getAttribute('content') !== computedDescription) {
      metaDescription.setAttribute('content', computedDescription)
    }
  }, [content])

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    try {
      const saved = await updateProfileOnServer(updates)
      setContent((prev) => ({
        ...prev,
        profile: saved,
      }))
      setError(null)
      return saved
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save profile')
      throw saveError
    }
  }, [])

  const updateSite = useCallback(async (siteMeta: SiteMeta) => {
    try {
      const saved = await updateSiteOnServer(siteMeta)
      setContent((prev) => ({
        ...prev,
        site: saved,
      }))
      setError(null)
      return saved
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save site metadata')
      throw saveError
    }
  }, [])

  const updatePosts = useCallback(async (posts: Post[]) => {
    try {
      const saved = await updatePostsOnServer(posts)
      setContent((prev) => ({
        ...prev,
        posts: computePostHtml(saved),
      }))
      setError(null)
      return saved
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save posts')
      throw saveError
    }
  }, [])

  const updateExperiences = useCallback(async (experiences: Experience[]) => {
    try {
      const saved = await updateExperiencesOnServer(experiences)
      setContent((prev) => ({
        ...prev,
        experiences: saved,
      }))
      setError(null)
      return saved
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save experiences')
      throw saveError
    }
  }, [])

  const updateTutorials = useCallback(async (tutorials: Tutorial[]) => {
    try {
      const saved = await updateTutorialsOnServer(tutorials)
      setContent((prev) => ({
        ...prev,
        tutorials: saved,
      }))
      setError(null)
      return saved
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save tutorials')
      throw saveError
    }
  }, [])

  const updateSections = useCallback(async (sections: SectionsContent) => {
    try {
      const saved = await updateSectionsOnServer(sections)
      setContent((prev) => ({
        ...prev,
        sections: saved,
      }))
      setError(null)
      return saved
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save sections')
      throw saveError
    }
  }, [])

  const resetContent = useCallback(async () => {
    try {
      const data = await resetContentOnServer()
      setContent(data)
      setError(null)
      return data
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Failed to reset content')
      throw resetError
    }
  }, [])

  const value = useMemo<ContentContextValue>(
    () => ({
      content,
      loading,
      error,
      refresh,
      updateSite,
      updateProfile,
      updatePosts,
      updateExperiences,
      updateTutorials,
      updateSections,
      resetContent,
    }),
    [
      content,
      loading,
      error,
      refresh,
      updateSite,
      updateProfile,
      updatePosts,
      updateExperiences,
      updateTutorials,
      updateSections,
      resetContent,
    ],
  )

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}

export const useContent = () => {
  const context = useContext(ContentContext)
  if (!context) {
    throw new Error('useContent must be used within a ContentProvider')
  }
  return context
}
