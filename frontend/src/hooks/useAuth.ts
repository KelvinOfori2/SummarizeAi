import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'
import { usersApi } from '@/api/users'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export function useAuth() {
  const { user, isAuthenticated, setTokens, setUser, logout } = useAuthStore()
  const navigate = useNavigate()

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password })
    const { access_token, refresh_token } = res.data
    setTokens(access_token, refresh_token)
    const meRes = await usersApi.getMe()
    setUser(meRes.data)
    toast.success(`Welcome back, ${meRes.data.username}!`)
    if (meRes.data.role === 'admin') {
      navigate('/admin')
    } else {
      navigate('/dashboard')
    }
  }

  const register = async (payload: {
    username: string
    email: string
    password: string
    password_confirm: string
    full_name?: string
  }) => {
    await authApi.register(payload)
    toast.success('Account created! Please log in.')
    navigate('/login')
  }

  const logoutUser = () => {
    logout()
    navigate('/')
    toast.success('Logged out successfully')
  }

  const refreshUser = async () => {
    try {
      const meRes = await usersApi.getMe()
      setUser(meRes.data)
    } catch {
      // silently fail
    }
  }

  return { user, isAuthenticated, login, register, logout: logoutUser, refreshUser }
}
