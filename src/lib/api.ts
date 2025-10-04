import type { ContentState, Experience, Post, Profile, SectionsContent, SiteMeta, Tutorial } from '../content'

export type AuthUser = {
  email: string
  loggedInAt?: string
}

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

const normalizeUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (!BASE_URL) {
    return normalizedPath
  }

  const trimmedBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL

  if (trimmedBase.startsWith('/')) {
    const pathWithoutBase = normalizedPath.startsWith(trimmedBase)
      ? normalizedPath.slice(trimmedBase.length)
      : normalizedPath

    const combined = `${trimmedBase}${pathWithoutBase.startsWith('/') ? '' : '/'}${pathWithoutBase}`
    return combined.replace(/\/{2,}/g, '/').replace(':/', '://')
  }

  return `${trimmedBase}${normalizedPath}`
}

const jsonHeaders = {
  'Content-Type': 'application/json',
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const message = await response
      .json()
      .then((body) => (body && typeof body.message === 'string' ? body.message : response.statusText))
      .catch(() => response.statusText)
    throw new Error(message || 'Request failed')
  }
  return response.json() as Promise<T>
}

const request = (path: string, init: RequestInit = {}) =>
  fetch(normalizeUrl(path), {
    credentials: 'include',
    ...init,
  })

export const fetchContent = async (): Promise<ContentState> => {
  const response = await request('/api/content')
  return handleResponse<ContentState>(response)
}

export const updateProfile = async (payload: Partial<Profile>): Promise<Profile> => {
  const response = await request('/api/profile', {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
  return handleResponse<Profile>(response)
}

export const updateSite = async (payload: SiteMeta): Promise<SiteMeta> => {
  const response = await request('/api/site', {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
  return handleResponse<SiteMeta>(response)
}

export const updatePosts = async (payload: Post[]): Promise<Post[]> => {
  const response = await request('/api/posts', {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
  return handleResponse<Post[]>(response)
}

export const deletePost = async (postId: string): Promise<Post[]> => {
  const response = await request(`/api/posts/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
  })
  return handleResponse<Post[]>(response)
}

export const updatePostVisibility = async (postId: string, hidden: boolean): Promise<Post[]> => {
  const response = await request(`/api/posts/${encodeURIComponent(postId)}/visibility`, {
    method: 'PATCH',
    headers: jsonHeaders,
    body: JSON.stringify({ hidden }),
  })
  return handleResponse<Post[]>(response)
}

export const updateExperiences = async (payload: Experience[]): Promise<Experience[]> => {
  const response = await request('/api/experiences', {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
  return handleResponse<Experience[]>(response)
}

export const updateTutorials = async (payload: Tutorial[]): Promise<Tutorial[]> => {
  const response = await request('/api/tutorials', {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
  return handleResponse<Tutorial[]>(response)
}

export const updateSections = async (payload: SectionsContent): Promise<SectionsContent> => {
  const response = await request('/api/sections', {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
  return handleResponse<SectionsContent>(response)
}

export const resetContent = async (): Promise<ContentState> => {
  const response = await request('/api/reset', {
    method: 'POST',
  })
  return handleResponse<ContentState>(response)
}

export const login = async ({ email, password }: { email: string; password: string }): Promise<AuthUser> => {
  const response = await request('/api/auth/login', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ email, password }),
  })
  return handleResponse<AuthUser>(response)
}

export const logout = async (): Promise<void> => {
  const response = await request('/api/auth/logout', {
    method: 'POST',
  })
  await handleResponse<{ success: boolean }>(response)
}

export const fetchCurrentUser = async (): Promise<AuthUser> => {
  const response = await request('/api/auth/me')
  return handleResponse<AuthUser>(response)
}
