import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  username: string
  email: string
  full_name?: string
  avatar_url?: string
  role: string
  is_active: boolean
  is_banned: boolean
  created_at: string
  last_login?: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setTokens: (access: string, refresh: string) => void
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setTokens: (access, refresh) => {
        localStorage.setItem('access_token', access)
        localStorage.setItem('refresh_token', refresh)
        set({ accessToken: access, refreshToken: refresh, isAuthenticated: true })
      },

      setUser: (user) => set({ user }),

      logout: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },
    }),
    {
      name: 'auth-store',
      // Persist ALL auth fields so isAuthenticated survives page reload
      partialize: (s) => ({
        accessToken:     s.accessToken,
        refreshToken:    s.refreshToken,
        isAuthenticated: s.isAuthenticated,
        user:            s.user,
      }),
    }
  )
)
