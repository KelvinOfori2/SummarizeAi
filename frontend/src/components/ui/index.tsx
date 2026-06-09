import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle } from 'lucide-react'

// ── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size]
  return (
    <div className={`${s} ${className} border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin`} />
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

// ── StatCard ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  accent?: string
  sub?: string
  loading?: boolean
}
export function StatCard({ label, value, icon, accent = 'brand', sub, loading }: StatCardProps) {
  const colors: Record<string, string> = {
    brand:  'from-brand-500/20 to-brand-600/5 border-brand-500/20 text-brand-400',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400',
    amber:  'from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400',
    pink:   'from-pink-500/20 to-pink-600/5 border-pink-500/20 text-pink-400',
  }
  const cls = colors[accent] || colors.brand
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      className={`relative overflow-hidden glass rounded-2xl p-5 border bg-gradient-to-br ${cls.split(' ').slice(0,2).join(' ')} border-${cls.split(' ')[2]}`}
    >
      <div className={`absolute top-4 right-4 ${cls.split(' ')[3]}`}>{icon}</div>
      <div className="space-y-1">
        <p className="text-xs font-mono text-white/40 uppercase tracking-widest">{label}</p>
        {loading ? (
          <Skeleton className="h-8 w-24 mt-2" />
        ) : (
          <p className="text-3xl font-display font-bold text-white">{value}</p>
        )}
        {sub && <p className="text-xs text-white/40">{sub}</p>}
      </div>
    </motion.div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center text-white/20 mb-4">
        {icon}
      </div>
      <h3 className="font-display font-semibold text-white/60 mb-1">{title}</h3>
      {description && <p className="text-sm text-white/30 max-w-xs">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, danger }: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative glass rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-display font-bold text-lg ${danger ? 'text-red-400' : 'text-white'}`}>
                {danger && <AlertTriangle className="inline w-5 h-5 mr-2" />}{title}
              </h3>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── PageHeader ────────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="font-display font-bold text-3xl text-white">{title}</h1>
        {subtitle && <p className="text-white/50 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ── Badge ────────────────────────────────────────────────────────────────────
export function AlgoBadge({ algorithm }: { algorithm: string }) {
  const map: Record<string, string> = {
    tfidf: 'badge badge-teal', lsa: 'badge badge-purple',
    lexrank: 'badge badge-amber', luhn: 'badge badge-green',
  }
  const labels: Record<string, string> = { tfidf: 'TF-IDF', lsa: 'LSA', lexrank: 'LexRank', luhn: 'Luhn' }
  return <span className={map[algorithm] || 'badge badge-teal'}>{labels[algorithm] || algorithm}</span>
}
