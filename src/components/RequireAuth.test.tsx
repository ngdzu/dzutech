import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { RequireAuth } from './RequireAuth'

// Mock functions declared before vi.mock calls
const mockNavigate = vi.fn()
const mockUseLocation = vi.fn()
const mockUseAuth = vi.fn()

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  Navigate: ({ to, state, replace }: { to: string; state?: unknown; replace?: boolean }) => {
    mockNavigate({ to, state, replace })
    return <div data-testid="navigate" />
  },
  useLocation: () => mockUseLocation()
}))

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}))

describe('RequireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows loading screen when authentication is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true
    })

    render(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>
    )

    expect(screen.getByText('Loading')).toBeInTheDocument()
    expect(screen.getByText('Verifying your session. This usually takes just a moment.')).toBeInTheDocument()
  })

  it('redirects to login when user is not authenticated', () => {
    const mockLocation = {
      pathname: '/admin',
      search: '?tab=dashboard',
      hash: '#section'
    }

    // Mock useLocation to return our test location
    mockUseLocation.mockReturnValue(mockLocation)

    mockUseAuth.mockReturnValue({
      user: null,
      loading: false
    })

    render(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>
    )

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/login',
      state: { from: '/admin?tab=dashboard#section' },
      replace: true
    })
  })

  it('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      loading: false
    })

    render(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('renders children when user object exists but is falsy', () => {
    // Test edge case where user might be an empty object or similar
    mockUseAuth.mockReturnValue({
      user: {},
      loading: false
    })

    render(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})