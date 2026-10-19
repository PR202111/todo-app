import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { authApi } from '../api/client'

interface User {
  id: number
  username: string
  email: string
  created_at: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authApi.me()
      .then(r => setUser(r.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const res = await authApi.login({ username, password })
    if (res.data.access_token) {
      localStorage.setItem('access_token', res.data.access_token)
    }
    setUser(res.data.user)
  }, [])

  const register = useCallback(async (username: string, email: string, password: string) => {
    const res = await authApi.register({ username, email, password })
    if (res.data.access_token) {
      localStorage.setItem('access_token', res.data.access_token)
    }
    setUser(res.data.user)
  }, [])

  const logout = useCallback(async () => {
    localStorage.removeItem('access_token')
    await authApi.logout().catch(() => {})
    setUser(null)
    window.location.href = '/login'
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
