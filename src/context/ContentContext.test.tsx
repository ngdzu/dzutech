import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ContentProvider, useContent } from './ContentContext'

// mock the api module
const mockFetchContent = vi.fn()
const mockUpdateSite = vi.fn()
const mockUpdateProfile = vi.fn()
const mockUpdatePosts = vi.fn()
const mockDeletePost = vi.fn()
const mockUpdatePostVisibility = vi.fn()
const mockUpdateExperiences = vi.fn()
const mockUpdateSections = vi.fn()
const mockResetContent = vi.fn()

vi.mock('../lib/api', () => ({
  fetchContent: () => mockFetchContent(),
  updateSite: (s: unknown) => mockUpdateSite(s),
  updateProfile: (p: unknown) => mockUpdateProfile(p),
  updatePosts: (p: unknown) => mockUpdatePosts(p),
  deletePost: (id: string) => mockDeletePost(id),
  updatePostVisibility: (id: string, hidden: boolean) => mockUpdatePostVisibility(id, hidden),
  updateExperiences: (e: unknown) => mockUpdateExperiences(e),
  updateSections: (s: unknown) => mockUpdateSections(s),
  resetContent: () => mockResetContent(),
}))

const TestConsumer = () => {
  const ctx = useContent()
  if (!ctx) return null

  return (
    <div>
      <button onClick={() => void ctx.refresh()}>refresh</button>
  <button onClick={() => void ctx.updateSite({ title: 'x', description: 'd', homeButtonMode: 'text', logo: null })}>updateSite</button>
      <button onClick={() => void ctx.updateProfile({ name: 'Alice' })}>updateProfile</button>
      <button onClick={() => void ctx.updatePosts([])}>updatePosts</button>
      <button onClick={() => void ctx.deletePost('p1')}>deletePost</button>
      <button onClick={() => void ctx.setPostVisibility('p1', true)}>setPostVisibility</button>
      <button onClick={() => void ctx.updateExperiences([])}>updateExperiences</button>
      <button onClick={() => void ctx.updateSections({ contact: { description: 'hi' } })}>updateSections</button>
      <button onClick={() => void ctx.resetContent()}>reset</button>
      <div data-testid="loading">{String(ctx.loading)}</div>
    </div>
  )
}

describe('ContentContext', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // sensible defaults for fetchContent
    mockFetchContent.mockResolvedValue({
      site: { title: 'T', description: 'D', homeButtonMode: 'text' },
      profile: { name: 'Me', title: 'Dev', tagline: '', summary: '', location: '', email: 'a@b.com', social: { linkedin: '', github: '' }, contactVisibility: {}, highlightsEnabled: true, availability: { value: '', enabled: false }, focusAreas: { value: '', enabled: false } },
      posts: [],
      experiences: [],
      sections: { contact: { description: '' } },
    })
    mockUpdateSite.mockResolvedValue({})
    mockUpdateProfile.mockResolvedValue({})
    mockUpdatePosts.mockResolvedValue([])
    mockDeletePost.mockResolvedValue([])
    mockUpdatePostVisibility.mockResolvedValue([])
    mockUpdateExperiences.mockResolvedValue([])
    mockUpdateSections.mockResolvedValue({ contact: { description: '' } })
    mockResetContent.mockResolvedValue({})
  })

  it('calls API methods when provider methods invoked', async () => {
    render(
      <ContentProvider>
        <TestConsumer />
      </ContentProvider>,
    )

    // refresh called by effect during mount -> should call fetchContent
    expect(mockFetchContent).toHaveBeenCalled()

    // call provider methods via buttons
    await act(async () => {
      screen.getByText('updateSite').click()
    })
    expect(mockUpdateSite).toHaveBeenCalled()

    await act(async () => {
      screen.getByText('updateProfile').click()
    })
    expect(mockUpdateProfile).toHaveBeenCalled()

    await act(async () => {
      screen.getByText('updatePosts').click()
    })
    expect(mockUpdatePosts).toHaveBeenCalled()

    await act(async () => {
      screen.getByText('deletePost').click()
    })
    expect(mockDeletePost).toHaveBeenCalledWith('p1')

    await act(async () => {
      screen.getByText('setPostVisibility').click()
    })
    expect(mockUpdatePostVisibility).toHaveBeenCalledWith('p1', true)

    await act(async () => {
      screen.getByText('updateExperiences').click()
    })
    expect(mockUpdateExperiences).toHaveBeenCalled()

    await act(async () => {
      screen.getByText('updateSections').click()
    })
    expect(mockUpdateSections).toHaveBeenCalled()

    await act(async () => {
      screen.getByText('reset').click()
    })
    expect(mockResetContent).toHaveBeenCalled()
  })
})
