import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor, act, renderHook } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import type { AuthUser } from '../lib/api'

// Mock the API functions
vi.mock('../lib/api', () => ({
  fetchCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}))

// Get references to the mocked functions
const { fetchCurrentUser, login, logout } = await import('../lib/api')
type FetchMock = ReturnType<typeof vi.fn>
const mockFetchCurrentUser = fetchCurrentUser as unknown as FetchMock
const mockLoginRequest = login as unknown as FetchMock
const mockLogoutRequest = logout as unknown as FetchMock

type AuthShape = {
  user: null | { email: string; loggedInAt?: string }
  loading: boolean
  error: string | null
  login: (creds: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const TestComponent = ({ onAuth }: { onAuth: (auth: AuthShape) => void }) => {
  const auth = useAuth()
  onAuth(auth)
  return <div>Test Component</div>
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('AuthProvider', () => {
    it('provides initial loading state', async () => {
      const mockAuth = vi.fn()

      render(
        <AuthProvider>
          <TestComponent onAuth={mockAuth} />
        </AuthProvider>
      )

      // Should call onAuth with initial state
      await waitFor(() => {
        expect(mockAuth).toHaveBeenCalledWith({
          user: null,
          loading: true,
          error: null,
          login: expect.any(Function),
          logout: expect.any(Function),
          refresh: expect.any(Function),
        })
      })
    })

    it('calls refresh on mount and handles successful authentication', async () => {
      const mockUser: AuthUser = { email: 'test@example.com', loggedInAt: '2024-01-01T00:00:00Z' }
      mockFetchCurrentUser.mockResolvedValue(mockUser)

      const mockAuth = vi.fn()

      render(
        <AuthProvider>
          <TestComponent onAuth={mockAuth} />
        </AuthProvider>
      )

      // Wait for refresh to complete
      await waitFor(() => {
        expect(mockFetchCurrentUser).toHaveBeenCalledTimes(1)
      })

      // Should eventually call with authenticated state
      await waitFor(() => {
        const calls = mockAuth.mock.calls
        const lastCall = calls[calls.length - 1]
        expect(lastCall[0]).toEqual({
          user: mockUser,
          loading: false,
          error: null,
          login: expect.any(Function),
          logout: expect.any(Function),
          refresh: expect.any(Function),
        })
      })
    })

    it('handles authentication failure on refresh', async () => {
      const errorMessage = 'Not authenticated'
      mockFetchCurrentUser.mockRejectedValue(new Error(errorMessage))

      const mockAuth = vi.fn()

      render(
        <AuthProvider>
          <TestComponent onAuth={mockAuth} />
        </AuthProvider>
      )

      // Wait for refresh to complete
      await waitFor(() => {
        expect(mockFetchCurrentUser).toHaveBeenCalledTimes(1)
      })

      // Should eventually call with error cleared (for "Not authenticated")
      await waitFor(() => {
        const calls = mockAuth.mock.calls
        const lastCall = calls[calls.length - 1]
        expect(lastCall[0]).toEqual({
          user: null,
          loading: false,
          error: null, // "Not authenticated" should clear error
          login: expect.any(Function),
          logout: expect.any(Function),
          refresh: expect.any(Function),
        })
      })
    })

    it('handles generic error on refresh', async () => {
      const errorMessage = 'Network error'
      mockFetchCurrentUser.mockRejectedValue(new Error(errorMessage))

      const mockAuth = vi.fn()

      render(
        <AuthProvider>
          <TestComponent onAuth={mockAuth} />
        </AuthProvider>
      )

      // Wait for refresh to complete
      await waitFor(() => {
        expect(mockFetchCurrentUser).toHaveBeenCalledTimes(1)
      })

      // Should eventually call with error set
      await waitFor(() => {
        const calls = mockAuth.mock.calls
        const lastCall = calls[calls.length - 1]
        expect(lastCall[0]).toEqual({
          user: null,
          loading: false,
          error: errorMessage,
          login: expect.any(Function),
          logout: expect.any(Function),
          refresh: expect.any(Function),
        })
      })
    })

    it('handles successful login', async () => {
      const mockUser: AuthUser = { email: 'test@example.com', loggedInAt: '2024-01-01T00:00:00Z' }
      const credentials = { email: 'test@example.com', password: 'password' }

      mockFetchCurrentUser.mockResolvedValue(null) // Initial refresh fails
      mockLoginRequest.mockResolvedValue(mockUser)

      const mockAuth = vi.fn()

      render(
        <AuthProvider>
          <TestComponent onAuth={mockAuth} />
        </AuthProvider>
      )

      // Wait for initial refresh
      await waitFor(() => {
        expect(mockFetchCurrentUser).toHaveBeenCalledTimes(1)
      })

  // Get the login function from the latest auth state
  let loginFunction: (creds: { email: string; password: string }) => Promise<void>
      await waitFor(() => {
        const calls = mockAuth.mock.calls
        const lastCall = calls[calls.length - 1]
        loginFunction = lastCall[0].login
        expect(loginFunction).toBeDefined()
      })

      // Call login
      await act(async () => {
        await loginFunction(credentials)
      })

      expect(mockLoginRequest).toHaveBeenCalledWith(credentials)

      // Should update state with logged in user
      await waitFor(() => {
        const calls = mockAuth.mock.calls
        const lastCall = calls[calls.length - 1]
        expect(lastCall[0]).toEqual({
          user: mockUser,
          loading: false,
          error: null,
          login: expect.any(Function),
          logout: expect.any(Function),
          refresh: expect.any(Function),
        })
      })
    })

    it('handles login failure', async () => {
      const errorMessage = 'Invalid credentials'
      const credentials = { email: 'test@example.com', password: 'wrong' }

      mockFetchCurrentUser.mockResolvedValue(null)
      mockLoginRequest.mockRejectedValue(new Error(errorMessage))

      const mockAuth = vi.fn()

      render(
        <AuthProvider>
          <TestComponent onAuth={mockAuth} />
        </AuthProvider>
      )

      // Wait for initial refresh
      await waitFor(() => {
        expect(mockFetchCurrentUser).toHaveBeenCalledTimes(1)
      })

  let loginFunction: (creds: { email: string; password: string }) => Promise<void>
      await waitFor(() => {
        const calls = mockAuth.mock.calls
        const lastCall = calls[calls.length - 1]
        loginFunction = lastCall[0].login
      })

      // Call login and expect it to throw
      await expect(act(async () => {
        await loginFunction(credentials)
      })).rejects.toThrow(errorMessage)

      expect(mockLoginRequest).toHaveBeenCalledWith(credentials)

      // Verify that login was attempted and failed
      expect(mockLoginRequest).toHaveBeenCalledTimes(1)
    })

    it('handles successful logout', async () => {
      const mockUser: AuthUser = { email: 'test@example.com', loggedInAt: '2024-01-01T00:00:00Z' }

      mockFetchCurrentUser.mockResolvedValue(mockUser)
      mockLogoutRequest.mockResolvedValue(undefined)

      const mockAuth = vi.fn()

      render(
        <AuthProvider>
          <TestComponent onAuth={mockAuth} />
        </AuthProvider>
      )

      // Wait for initial authentication
      await waitFor(() => {
        const calls = mockAuth.mock.calls
        const lastCall = calls[calls.length - 1]
        expect(lastCall[0].user).toEqual(mockUser)
      })

  let logoutFunction: () => Promise<void>
      await waitFor(() => {
        const calls = mockAuth.mock.calls
        const lastCall = calls[calls.length - 1]
        logoutFunction = lastCall[0].logout
      })

      // Call logout
      await act(async () => {
        await logoutFunction()
      })

      expect(mockLogoutRequest).toHaveBeenCalledTimes(1)

      // Should clear user and error
      await waitFor(() => {
        const calls = mockAuth.mock.calls
        const lastCall = calls[calls.length - 1]
        expect(lastCall[0]).toEqual({
          user: null,
          loading: false,
          error: null,
          login: expect.any(Function),
          logout: expect.any(Function),
          refresh: expect.any(Function),
        })
      })
    })

    it('handles logout failure', async () => {
      const mockUser: AuthUser = { email: 'test@example.com', loggedInAt: '2024-01-01T00:00:00Z' }
      const errorMessage = 'Logout failed'

      mockFetchCurrentUser.mockResolvedValue(mockUser)
      mockLogoutRequest.mockRejectedValue(new Error(errorMessage))

      const mockAuth = vi.fn()

      render(
        <AuthProvider>
          <TestComponent onAuth={mockAuth} />
        </AuthProvider>
      )

      // Wait for initial authentication
      await waitFor(() => {
        const calls = mockAuth.mock.calls
        const lastCall = calls[calls.length - 1]
        expect(lastCall[0].user).toEqual(mockUser)
      })

  let logoutFunction: () => Promise<void>
      await waitFor(() => {
        const calls = mockAuth.mock.calls
        const lastCall = calls[calls.length - 1]
        logoutFunction = lastCall[0].logout
      })

      // Call logout and expect it to throw
      await expect(act(async () => {
        await logoutFunction()
      })).rejects.toThrow(errorMessage)

      expect(mockLogoutRequest).toHaveBeenCalledTimes(1)

      // Verify that logout was attempted and failed
      expect(mockLogoutRequest).toHaveBeenCalledTimes(1)
    })
  })

  describe('error handling with non-Error objects', () => {
    it('handles non-Error refresh failure with generic message', async () => {
      const mockError = 'String error'
      mockFetchCurrentUser.mockRejectedValueOnce(mockError)

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Unable to determine authentication state')
        expect(result.current.user).toBeNull()
        expect(result.current.loading).toBe(false)
      })
    })

    it('handles non-Error login failure with generic message', async () => {
      const mockError = { code: 500 }
      mockLoginRequest.mockRejectedValueOnce(mockError)

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      const credentials = { email: 'test@example.com', password: 'password' }

      await act(async () => {
        await expect(result.current.login(credentials)).rejects.toEqual(mockError)
      })

      expect(result.current.error).toBe('Unable to log in')
      expect(result.current.user).toBeNull()
      expect(result.current.loading).toBe(false)
    })

    it('handles non-Error logout failure with generic message', async () => {
      const mockError = 404
      mockLogoutRequest.mockRejectedValueOnce(mockError)

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await act(async () => {
        await expect(result.current.logout()).rejects.toEqual(mockError)
      })

      expect(result.current.error).toBe('Unable to log out')
      expect(result.current.user).toBeUndefined() // User state is not changed on logout failure
      expect(result.current.loading).toBe(false)
    })
  })

  describe('useAuth hook', () => {
    it('throws error when used outside AuthProvider', () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestComponent onAuth={() => {}} />)
      }).toThrow('useAuth must be used within an AuthProvider')

      consoleSpy.mockRestore()
    })
  })
})