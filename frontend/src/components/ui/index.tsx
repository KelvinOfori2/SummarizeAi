import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle } from 'lucide-react'

// ── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size]
  return (
    <div className={`${s} ${className} border-2 border-white/10 border-t-brand-500 rounded-full animate-spin`} />
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
export function StatCard({ label, value, icon, sub, loading }: StatCardProps) {
  return (
    <div className="bg-dark-900 border border-dark-800 rounded-lg p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-mono text-white/40 uppercase tracking-wider">{label}</p>
        <span className="text-white/20">{icon}</span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <p className="text-3xl font-display font-semibold text-white">{value}</p>
      )}
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
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
      <div className="w-12 h-12 rounded-lg border border-dark-700 flex items-center justify-center text-white/20 mb-4">
        {icon}
      </div>
      <h3 className="font-body font-medium text-white/50 mb-1">{title}</h3>
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
          <div className="absolute inset-0 bg-black/60" />
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-dark-900 border border-dark-700 rounded-lg p-6 w-full max-w-md shadow-modal"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className={`font-display font-semibold text-lg ${danger ? 'text-red-400' : 'text-white'}`}>
                {danger && <AlertTriangle className="inline w-5 h-5 mr-2" />}{title}
              </h3>
              <button onClick={onClose} className="p-1 rounded hover:bg-dark-800 text-white/40 hover:text-white transition-colors">
                <X className="w-4 h-4" />
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
        <h1 className="font-display font-semibold text-2xl text-white">{title}</h1>
        {subtitle && <p className="text-sm text-white/40 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ── AlgoBadge ────────────────────────────────────────────────────────────────
export function AlgoBadge({ algorithm }: { algorithm: string }) {
  const map: Record<string, string> = {
    tfidf:   'badge badge-teal',
    lsa:     'badge badge-purple',
    lexrank: 'badge badge-amber',
    luhn:    'badge badge-green',
  }
  const labels: Record<string, string> = { tfidf: 'TF-IDF', lsa: 'LSA', lexrank: 'LexRank', luhn: 'Luhn' }
  return <span className={map[algorithm] || 'badge badge-teal'}>{labels[algorithm] || algorithm}</span>
}
