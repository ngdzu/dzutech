import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  ContentState,
  Experience,
  Post,
  Profile,
  ResourceLink,
  Tutorial,
} from '../content'
import { defaultContent } from '../content'
import {
  fetchContent as fetchContentFromApi,
  resetContent as resetContentOnServer,
  updateExperiences as updateExperiencesOnServer,
  updatePosts as updatePostsOnServer,
  updateProfile as updateProfileOnServer,
  updateTutorials as updateTutorialsOnServer,
  updateUsefulLinks as updateUsefulLinksOnServer,
} from '../lib/api'

type ContentContextValue = {
  content: ContentState
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<Profile>
  updatePosts: (posts: Post[]) => Promise<Post[]>
  updateExperiences: (experiences: Experience[]) => Promise<Experience[]>
  updateUsefulLinks: (links: ResourceLink[]) => Promise<ResourceLink[]>
  updateTutorials: (tutorials: Tutorial[]) => Promise<Tutorial[]>
  resetContent: () => Promise<ContentState>
}

const ContentContext = createContext<ContentContextValue | undefined>(undefined)

const cloneContent = (): ContentState => JSON.parse(JSON.stringify(defaultContent))

export const ContentProvider = ({ children }: { children: ReactNode }) => {
  const [content, setContent] = useState<ContentState>(() => cloneContent())
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchContentFromApi()
      setContent(data)
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

  const updatePosts = useCallback(async (posts: Post[]) => {
    try {
      const saved = await updatePostsOnServer(posts)
      setContent((prev) => ({
        ...prev,
        posts: saved,
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

  const updateUsefulLinks = useCallback(async (links: ResourceLink[]) => {
    try {
      const saved = await updateUsefulLinksOnServer(links)
      setContent((prev) => ({
        ...prev,
        usefulLinks: saved,
      }))
      setError(null)
      return saved
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save links')
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
      updateProfile,
      updatePosts,
      updateExperiences,
      updateUsefulLinks,
      updateTutorials,
      resetContent,
    }),
    [
      content,
      loading,
      error,
      refresh,
      updateProfile,
      updatePosts,
      updateExperiences,
      updateUsefulLinks,
      updateTutorials,
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
