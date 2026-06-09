import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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

// Live connection indicator dot
function WSIndicator() {
  const { status } = useWS()
  const cfg = {
    connected:    { color: 'bg-emerald-400', label: 'Live',         pulse: true  },
    connecting:   { color: 'bg-amber-400',   label: 'Connecting…',  pulse: true  },
    disconnected: { color: 'bg-white/20',    label: 'Offline',      pulse: false },
    error:        { color: 'bg-red-400',     label: 'WS Error',     pulse: false },
  }[status]

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-white/10" title={`WebSocket: ${status}`}>
      <span className={`relative flex w-2 h-2`}>
        {cfg.pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.color} opacity-60`} />
        )}
        <span className={`relative inline-flex rounded-full w-2 h-2 ${cfg.color}`} />
      </span>
      <span className="text-xs text-white/50 font-mono">{cfg.label}</span>
    </div>
  )
}

function NavItems({ nav, onClose }: { nav: typeof userNav; onClose?: () => void }) {
  return (
    <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto no-scrollbar">
      {nav.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to} to={to}
          end={to === '/admin' || to === '/dashboard'}
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
            ${isActive
              ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
              : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-brand-400' : 'text-white/40 group-hover:text-white/70'}`} />
              <span className="text-sm font-medium">{label}</span>
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
  const nav = isAdmin ? adminNav : userNav

  const handleLogout = () => {
    logout()
    navigate('/')
    toast.success('Logged out')
    onClose?.()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-neon-teal">
            <Zap className="w-4 h-4 text-dark-950" />
          </div>
          <span className="font-display font-bold text-white">SummarizeAI</span>
        </div>
        {onClose && (
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors lg:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* WS indicator */}
      <div className="px-3 pt-3">
        <WSIndicator />
      </div>

      {/* Admin badge */}
      {isAdmin && (
        <div className="mx-3 mt-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-mono text-purple-400">Admin Panel</span>
        </div>
      )}

      <NavItems nav={nav} onClose={onClose} />

      {/* User footer */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl mb-1">
          <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0 overflow-hidden">
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              : <span className="text-xs font-bold text-brand-400">{user?.username?.[0]?.toUpperCase()}</span>
            }
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{user?.username}</p>
            <p className="text-xs text-white/30 truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200">
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium">Logout</span>
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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 glass border-b border-white/[0.06] flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-dark-950" />
          </div>
          <span className="font-display font-bold text-white text-sm">SummarizeAI</span>
        </div>
        <button onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg glass text-white/60 hover:text-white transition-colors"
          aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)} />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-72 glass border-r border-white/[0.06] lg:hidden">
              <SidebarContent onClose={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 h-full glass border-r border-white/[0.06]">
        <SidebarContent />
      </aside>
    </>
  )
}
