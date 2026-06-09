import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { usersApi } from '@/api/users'
import { summariesApi } from '@/api/summaries'
import { useAuthStore } from '@/store/authStore'
import { StatCard, Skeleton, AlgoBadge, EmptyState } from '@/components/ui'
import { formatNumber, timeAgo, compressionPercent } from '@/utils/helpers'
import { FileText, Zap, BookOpen, TrendingUp, Clock, ArrowRight, History, Activity } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuthStore()
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => usersApi.getStats().then(r => r.data),
  })
  const { data: summaries, isLoading: summariesLoading } = useQuery({
    queryKey: ['summaries', 1, 5],
    queryFn: () => summariesApi.list(1, 5).then(r => r.data),
  })
  const { data: activity } = useQuery({
    queryKey: ['activity'],
    queryFn: () => usersApi.getActivity().then(r => r.data),
  })

  const container: any = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
  const item: any = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-mono text-brand-400 uppercase tracking-widest mb-1">Dashboard</p>
        <h1 className="font-display font-bold text-2xl md:text-3xl text-white">
          Welcome back, <span className="text-gradient">{user?.username}</span> 👋
        </h1>
        <p className="text-white/40 mt-1 text-sm">Here's what's happening with your documents.</p>
      </motion.div>

      {/* Stats — responsive grid */}
      <motion.div variants={container} initial="hidden" animate="show" className="stat-grid">
        {[
          { label: 'Total Summaries', value: formatNumber(stats?.total_summaries ?? 0),    icon: <FileText className="w-5 h-5" />, accent: 'brand',  sub: 'all time' },
          { label: 'Words Processed', value: formatNumber(stats?.total_words_processed ?? 0), icon: <BookOpen className="w-5 h-5" />, accent: 'purple', sub: 'input' },
          { label: 'Words Saved',     value: formatNumber(stats?.total_words_saved ?? 0),     icon: <TrendingUp className="w-5 h-5" />,accent: 'amber',  sub: 'compressed' },
          { label: 'Last Activity',   value: stats?.last_activity ? timeAgo(stats.last_activity) : '—', icon: <Clock className="w-5 h-5" />, accent: 'pink' },
        ].map((s, i) => (
          <motion.div key={s.label} variants={item}>
            <StatCard {...s} loading={statsLoading} />
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Summaries */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg md:text-xl text-white">Recent Summaries</h2>
            <Link to="/history" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {summariesLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : summaries?.items?.length === 0 ? (
            <EmptyState icon={<FileText className="w-7 h-7" />} title="No summaries yet"
              description="Create your first summary to see it here."
              action={<Link to="/summarize" className="btn-primary text-sm px-5 py-2.5"><Zap className="w-4 h-4" />Start Summarizing</Link>} />
          ) : (
            <div className="space-y-2">
              {summaries?.items?.map((s: any, i: number) => (
                <motion.div key={s.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="glass glass-hover rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <AlgoBadge algorithm={s.algorithm} />
                        <span className="text-xs text-white/30">{timeAgo(s.created_at)}</span>
                      </div>
                      <p className="text-sm font-medium text-white truncate">{s.title || 'Untitled'}</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {s.original_word_count} → {s.summary_word_count} words · {compressionPercent(s.compression_ratio)} saved
                      </p>
                    </div>
                    <Link to="/history" className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors touch-target">
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions + Activity */}
        <div className="space-y-5">
          <div>
            <h2 className="font-display font-bold text-lg text-white mb-3">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { to: '/summarize', icon: Zap,     color: 'brand',  label: 'New Summary',  sub: 'Paste text or upload file' },
                { to: '/history',   icon: History, color: 'purple', label: 'View History', sub: 'Browse past summaries'     },
              ].map(({ to, icon: Icon, color, label, sub }) => (
                <Link key={to} to={to}
                  className="glass glass-hover rounded-xl p-4 flex items-center gap-3 group transition-all touch-target">
                  <div className={`w-9 h-9 rounded-lg bg-${color === 'brand' ? 'brand' : 'purple'}-500/20 border border-${color === 'brand' ? 'brand' : 'purple'}-500/30 flex items-center justify-center text-${color === 'brand' ? 'brand' : 'purple'}-400 shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-xs text-white/40">{sub}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-display font-semibold text-base text-white mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-400" /> Recent Activity
            </h2>
            <div className="space-y-1">
              {activity?.slice(0, 5).map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                  <p className="text-xs text-white/60 flex-1 capitalize">{log.action.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-white/30 shrink-0">{timeAgo(log.created_at)}</p>
                </div>
              ))}
              {(!activity || activity.length === 0) && (
                <p className="text-xs text-white/30 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
