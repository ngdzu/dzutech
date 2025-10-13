import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AdminSessionActions } from './AdminSessionActions'
import { AuthProvider } from '../context/AuthContext'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock AuthContext
const mockLogout = vi.fn()
vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext')
  return {
    ...actual,
    useAuth: () => ({
      user: { email: 'admin@example.com' },
      logout: mockLogout,
      login: vi.fn(),
      refresh: vi.fn(),
      loading: false,
      error: null,
    }),
  }
})

describe('AdminSessionActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders user email and sign out button', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <AdminSessionActions />
        </AuthProvider>
      </MemoryRouter>
    )

    expect(screen.getByText((_, element) => {
      return element?.textContent === 'Signed in as admin@example.com'
    })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
    expect(screen.getByTestId('logout-icon')).toBeInTheDocument()
  })

  it('calls logout and navigates on successful logout', async () => {
    mockLogout.mockResolvedValueOnce(undefined)

    render(
      <MemoryRouter>
        <AuthProvider>
          <AdminSessionActions />
        </AuthProvider>
      </MemoryRouter>
    )

    const signOutButton = screen.getByRole('button', { name: /sign out/i })
    fireEvent.click(signOutButton)

    // Should show loading state
    expect(screen.getByText('Signing out…')).toBeInTheDocument()
    expect(signOutButton).toBeDisabled()

    // Should call logout
    expect(mockLogout).toHaveBeenCalledTimes(1)

    // Should navigate after successful logout
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })

    // Loading state should be cleared
    await waitFor(() => {
      expect(screen.getByText('Sign out')).toBeInTheDocument()
      expect(signOutButton).not.toBeDisabled()
    })
  })

  it('displays error message on logout failure', async () => {
    const errorMessage = 'Network error'
    mockLogout.mockRejectedValueOnce(new Error(errorMessage))

    render(
      <MemoryRouter>
        <AuthProvider>
          <AdminSessionActions />
        </AuthProvider>
      </MemoryRouter>
    )

    const signOutButton = screen.getByRole('button', { name: /sign out/i })
    fireEvent.click(signOutButton)

    // Should show loading state
    expect(screen.getByText('Signing out…')).toBeInTheDocument()

    // Should display error after failure
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    // Loading state should be cleared
    expect(screen.getByText('Sign out')).toBeInTheDocument()
    expect(signOutButton).not.toBeDisabled()
  })

  it('displays generic error message for non-Error logout failure', async () => {
    mockLogout.mockRejectedValueOnce('String error')

    render(
      <MemoryRouter>
        <AuthProvider>
          <AdminSessionActions />
        </AuthProvider>
      </MemoryRouter>
    )

    const signOutButton = screen.getByRole('button', { name: /sign out/i })
    fireEvent.click(signOutButton)

    // Should display generic error message
    await waitFor(() => {
      expect(screen.getByText('Unable to log out. Please try again.')).toBeInTheDocument()
    })
  })

  it('clears previous error on new logout attempt', async () => {
    // First logout fails
    mockLogout.mockRejectedValueOnce(new Error('First error'))

    render(
      <MemoryRouter>
        <AuthProvider>
          <AdminSessionActions />
        </AuthProvider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))

    await waitFor(() => {
      expect(screen.getByText('First error')).toBeInTheDocument()
    })

    // Second logout succeeds
    mockLogout.mockResolvedValueOnce(undefined)

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))

    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByText('First error')).not.toBeInTheDocument()
    })

    // Should navigate after success
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
  })
})