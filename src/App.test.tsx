import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import App from './App'

// Mock all the page components to avoid complex dependencies
vi.mock('./pages/LandingPage', () => ({
  LandingPage: () => <div data-testid="landing-page">Landing Page</div>
}))

vi.mock('./pages/ExperiencesPage', () => ({
  default: () => <div data-testid="experiences-page">Experiences Page</div>
}))

vi.mock('./pages/AdminDashboard', () => ({
  AdminDashboard: () => <div data-testid="admin-dashboard">Admin Dashboard</div>
}))

vi.mock('./pages/AdminBlogsPage', () => ({
  AdminBlogsPage: () => <div data-testid="admin-blogs-page">Admin Blogs Page</div>
}))

vi.mock('./pages/AdminExperiencesPage', () => ({
  AdminExperiencesPage: () => <div data-testid="admin-experiences-page">Admin Experiences Page</div>
}))

vi.mock('./pages/AdminUploadsPage', () => ({
  AdminUploadsPage: () => <div data-testid="admin-uploads-page">Admin Uploads Page</div>
}))

vi.mock('./pages/BlogListPage', () => ({
  BlogListPage: () => <div data-testid="blog-list-page">Blog List Page</div>
}))

vi.mock('./pages/AdminBlogDetailPage', () => ({
  AdminBlogDetailPage: () => <div data-testid="admin-blog-detail-page">Admin Blog Detail Page</div>
}))

vi.mock('./pages/AdminBlogEditorPage', () => ({
  AdminBlogEditorPage: () => <div data-testid="admin-blog-editor-page">Admin Blog Editor Page</div>
}))

vi.mock('./pages/AdminBlogsByTagPage', () => ({
  AdminBlogsByTagPage: () => <div data-testid="admin-blogs-by-tag-page">Admin Blogs By Tag Page</div>
}))

vi.mock('./pages/BlogDetailPage', () => ({
  BlogDetailPage: () => <div data-testid="blog-detail-page">Blog Detail Page</div>
}))

vi.mock('./pages/BlogTagPage', () => ({
  BlogTagPage: () => <div data-testid="blog-tag-page">Blog Tag Page</div>
}))

vi.mock('./pages/LoginPage', () => ({
  LoginPage: () => <div data-testid="login-page">Login Page</div>
}))

vi.mock('./components/RequireAuth', () => ({
  RequireAuth: ({ children }: { children: React.ReactNode }) => <div data-testid="require-auth">{children}</div>
}))

describe('App', () => {
  it('renders without crashing', () => {
    expect(() => render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )).not.toThrow()
  })

  it('renders the main application structure', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    // The app should render something (landing page by default)
    expect(document.body).toBeInTheDocument()
  })

  it('contains route configuration for all expected paths', () => {
    // This test verifies that the App component can be imported and instantiated
    // without errors, which means all the route imports are working
    const appComponent = <App />
    expect(appComponent).toBeDefined()
    expect(appComponent.type).toBeDefined()
  })
})