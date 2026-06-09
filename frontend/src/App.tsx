import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { createContext, useContext } from 'react'

import { ProtectedRoute, AdminRoute, PublicRoute } from '@/guards/RouteGuards'
import { AppLayout } from '@/components/layout/AppLayout'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { WSStatus } from '@/hooks/useWebSocket'

import Landing        from '@/pages/Landing'
import Login          from '@/pages/Login'
import Register       from '@/pages/Register'
import ForgotPassword from '@/pages/ForgotPassword'
import Dashboard      from '@/pages/Dashboard'
import Summarize      from '@/pages/Summarize'
import History        from '@/pages/History'
import Profile        from '@/pages/Profile'

import AdminDashboard    from '@/pages/admin/AdminDashboard'
import UserManagement    from '@/pages/admin/UserManagement'
import SummaryManagement from '@/pages/admin/SummaryManagement'
import SystemLogs        from '@/pages/admin/SystemLogs'
import AdminSettings     from '@/pages/admin/AdminSettings'

// ── WebSocket context — lets any component read connection status ─────────────
interface WSContextValue { status: WSStatus; send: (type: string, data?: Record<string, unknown>) => void }
const WSContext = createContext<WSContextValue>({ status: 'disconnected', send: () => {} })
export const useWS = () => useContext(WSContext)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
})

// Must be inside QueryClientProvider so useQueryClient() works in the hook
function WSProvider({ children }: { children: React.ReactNode }) {
  const { status, send } = useWebSocket()
  return <WSContext.Provider value={{ status, send }}>{children}</WSContext.Provider>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <WSProvider>
          <Routes>
            {/* Public */}
            <Route path="/"                element={<Landing />} />
            <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register"        element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

            {/* User */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/summarize" element={<Summarize />} />
              <Route path="/history"   element={<History />} />
              <Route path="/profile"   element={<Profile />} />
            </Route>

            {/* Admin */}
            <Route element={<AdminRoute><AppLayout /></AdminRoute>}>
              <Route path="/admin"           element={<AdminDashboard />} />
              <Route path="/admin/users"     element={<UserManagement />} />
              <Route path="/admin/summaries" element={<SummaryManagement />} />
              <Route path="/admin/logs"      element={<SystemLogs />} />
              <Route path="/admin/settings"  element={<AdminSettings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </WSProvider>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0d1f35',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            fontSize: '14px',
            fontFamily: 'DM Sans, sans-serif',
            maxWidth: '90vw',
          },
          success: { iconTheme: { primary: '#14b8a6', secondary: '#042f2e' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#1f0707' } },
        }}
      />
    </QueryClientProvider>
  )
}
