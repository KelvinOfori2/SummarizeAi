import { NavLink, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, Zap, History, User,
  Shield, BarChart3, Users, FileSearch, ScrollText, Settings,
  LogOut, Menu, X,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useWS } from '@/App'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const userNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/summarize',  icon: Zap,             label: 'Summarize'  },
  { to: '/history',    icon: History,          label: 'History'    },
  { to: '/profile',    icon: User,             label: 'Profile'    },
]
const adminNav = [
  { to: '/admin',           icon: BarChart3,  label: 'Overview'  },
  { to: '/admin/users',     icon: Users,      label: 'Users'     },
  { to: '/admin/summaries', icon: FileSearch, label: 'Summaries' },
  { to: '/admin/logs',      icon: ScrollText, label: 'Logs'      },
  { to: '/admin/settings',  icon: Settings,   label: 'Settings'  },
]

function WSIndicator() {
  const { status } = useWS()
  const cfg = {
    connected:    { color: 'bg-emerald-500', label: 'Live'        },
    connecting:   { color: 'bg-amber-500',   label: 'Connecting'  },
    disconnected: { color: 'bg-white/20',    label: 'Offline'     },
    error:        { color: 'bg-red-500',     label: 'Error'       },
  }[status]

  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.color} shrink-0`} />
      <span className="text-xs text-white/30 font-mono">{cfg.label}</span>
    </div>
  )
}

function NavItems({ nav, onClose }: { nav: typeof userNav; onClose?: () => void }) {
  return (
    <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto no-scrollbar">
      {nav.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to} to={to}
          end={to === '/admin' || to === '/dashboard'}
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors duration-150
            ${isActive
              ? 'bg-dark-800 text-white border-l-2 border-brand-500 pl-[10px]'
              : 'text-white/40 hover:text-white hover:bg-dark-800/60 border-l-2 border-transparent pl-[10px]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-400' : 'text-white/30'}`} />
              <span className="font-body font-medium">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const nav = isAdmin ? [...userNav, ...adminNav] : userNav

  const handleLogout = () => {
    logout()
    navigate('/')
    toast.success('Logged out')
    onClose?.()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-dark-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-brand-500 flex items-center justify-center shrink-0">
            <Zap className="w-3.5 h-3.5 text-dark-950" />
          </div>
          <span className="font-display font-semibold text-white text-[15px]">SummarizeAI</span>
        </div>
        {onClose && (
          <button onClick={onClose}
            className="p-1 rounded hover:bg-dark-800 text-white/30 hover:text-white transition-colors lg:hidden">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="px-1 pt-2">
        <WSIndicator />
      </div>

      {isAdmin && (
        <div className="mx-3 mt-1 px-2.5 py-1.5 rounded border border-dark-700 flex items-center gap-2">
          <Shield className="w-3 h-3 text-white/30" />
          <span className="text-xs font-mono text-white/30">admin</span>
        </div>
      )}

      <NavItems nav={nav} onClose={onClose} />

      {/* User footer */}
      <div className="p-3 border-t border-dark-800">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
          <div className="w-7 h-7 rounded bg-dark-700 border border-dark-600 flex items-center justify-center shrink-0 overflow-hidden">
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              : <span className="text-xs font-bold text-white/50">{user?.username?.[0]?.toUpperCase()}</span>
            }
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white truncate">{user?.username}</p>
            <p className="text-xs text-white/30 truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-white/30 hover:text-red-400 hover:bg-dark-800 transition-colors duration-150 text-sm">
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span className="font-body">Sign out</span>
        </button>
      </div>
    </div>
  )
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 1024) setMobileOpen(false) }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-dark-950 border-b border-dark-800 flex items-center justify-between px-4 h-12">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-brand-500 flex items-center justify-center">
            <Zap className="w-3 h-3 text-dark-950" />
          </div>
          <span className="font-display font-semibold text-white text-sm">SummarizeAI</span>
        </div>
        <button onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded hover:bg-dark-800 text-white/40 hover:text-white transition-colors"
          aria-label="Open menu">
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 lg:hidden"
              onClick={() => setMobileOpen(false)} />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-64 bg-dark-950 border-r border-dark-800 lg:hidden">
              <SidebarContent onClose={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 h-full bg-dark-950 border-r border-dark-800">
        <SidebarContent />
      </aside>
    </>
  )
}
