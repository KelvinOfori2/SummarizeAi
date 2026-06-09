import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { usersApi } from '@/api/users'

export function AppLayout() {
  const { setUser, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      usersApi.getMe().then(r => setUser(r.data)).catch(() => {})
    }
  }, [isAuthenticated])

  return (
    <div className="flex h-screen overflow-hidden bg-dark-950">
      <Sidebar />
      {/* pt-14 on mobile to clear the fixed top-bar; lg:pt-0 on desktop */}
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="min-h-full p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
