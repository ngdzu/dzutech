import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AuthUser } from '../lib/api'
import { fetchCurrentUser, login as loginRequest, logout as logoutRequest } from '../lib/api'

export type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  error: string | null
  login: (credentials: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const currentUser = await fetchCurrentUser()
      setUser(currentUser)
      setError(null)
    } catch (refreshError) {
      setUser(null)
      const message = refreshError instanceof Error ? refreshError.message : 'Unable to determine authentication state'
      if (message === 'Not authenticated' || message === 'Authentication required') {
        setError(null)
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
    setLoading(true)
    try {
      const authenticatedUser = await loginRequest({ email, password })
      setUser(authenticatedUser)
      setError(null)
    } catch (loginError) {
      setUser(null)
      setError(loginError instanceof Error ? loginError.message : 'Unable to log in')
      throw loginError
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setLoading(true)
    try {
      await logoutRequest()
      setUser(null)
      setError(null)
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'Unable to log out')
      throw logoutError
    } finally {
      setLoading(false)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      login,
      logout,
      refresh,
    }),
    [user, loading, error, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
