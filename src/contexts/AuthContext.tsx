import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'
// Auth routes live at the root (not under /api)
const API_ROOT = API_BASE.replace(/\/api\/?$/, '')
const TOKEN_KEY = 'floosball_token'

export interface AuthUser {
  id: number
  email: string
  username: string | null
  favoriteTeamId: number | null
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username?: string) => Promise<void>
  logout: () => void
  setFavoriteTeam: (teamId: number) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [loading, setLoading] = useState<boolean>(!!localStorage.getItem(TOKEN_KEY))

  const fetchMe = useCallback(async (tok: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) throw new Error('Unauthorized')
      const data = await res.json()
      setUser(data)
      return true
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      setToken(null)
      setUser(null)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  // On mount, validate any stored token
  useEffect(() => {
    if (token) {
      fetchMe(token)
    } else {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email: string, password: string) => {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)

    const res = await fetch(`${API_ROOT}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Login failed')
    }
    const { access_token } = await res.json()
    localStorage.setItem(TOKEN_KEY, access_token)
    setToken(access_token)
    await fetchMe(access_token)
  }, [fetchMe])

  const register = useCallback(async (email: string, password: string, username?: string) => {
    const body: Record<string, string> = { email, password }
    if (username) body.username = username

    const res = await fetch(`${API_ROOT}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Registration failed')
    }
    // Auto-login after successful register
    await login(email, password)
  }, [login])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const setFavoriteTeam = useCallback(async (teamId: number) => {
    if (!token) return
    const res = await fetch(`${API_BASE}/user/favorite-team`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ teamId }),
    })
    if (res.ok) {
      setUser(prev => prev ? { ...prev, favoriteTeamId: teamId } : prev)
    }
  }, [token])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, setFavoriteTeam }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
