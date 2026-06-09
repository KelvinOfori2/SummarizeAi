import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { adminApi } from '@/api/admin'
import { StatCard, Skeleton, AlgoBadge } from '@/components/ui'
import { formatNumber } from '@/utils/helpers'
import { Users, FileText, TrendingUp, Activity, Cpu, BarChart3 } from 'lucide-react'

export default function AdminDashboard() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminApi.getAnalytics().then(r => r.data),
    refetchInterval: 60_000,
  })

  const container: any = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
  const item: any = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-mono text-purple-400 uppercase tracking-widest mb-1">Admin</p>
        <h1 className="font-display font-bold text-3xl text-white">Analytics Overview</h1>
        <p className="text-white/40 mt-1">Real-time platform metrics from the database.</p>
      </motion.div>

      {/* User Stats */}
      <div>
        <h2 className="font-display font-semibold text-lg text-white/60 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" /> Users
        </h2>
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div variants={item}><StatCard label="Total Users" value={formatNumber(analytics?.total_users ?? 0)} icon={<Users className="w-5 h-5" />} accent="brand" loading={isLoading} /></motion.div>
          <motion.div variants={item}><StatCard label="Active Users" value={formatNumber(analytics?.active_users ?? 0)} icon={<Activity className="w-5 h-5" />} accent="amber" loading={isLoading} /></motion.div>
          <motion.div variants={item}><StatCard label="Banned Users" value={formatNumber(analytics?.banned_users ?? 0)} icon={<Users className="w-5 h-5" />} accent="pink" loading={isLoading} /></motion.div>
          <motion.div variants={item}><StatCard label="Total Summaries" value={formatNumber(analytics?.total_summaries ?? 0)} icon={<FileText className="w-5 h-5" />} accent="purple" loading={isLoading} /></motion.div>
        </motion.div>
      </div>

      {/* Summary Stats */}
      <div>
        <h2 className="font-display font-semibold text-lg text-white/60 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" /> Summarization Activity
        </h2>
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div variants={item}><StatCard label="Today" value={analytics?.summaries_today ?? 0} icon={<TrendingUp className="w-5 h-5" />} accent="brand" loading={isLoading} sub="summaries" /></motion.div>
          <motion.div variants={item}><StatCard label="This Week" value={analytics?.summaries_this_week ?? 0} icon={<BarChart3 className="w-5 h-5" />} accent="amber" loading={isLoading} sub="summaries" /></motion.div>
          <motion.div variants={item}><StatCard label="This Month" value={analytics?.summaries_this_month ?? 0} icon={<BarChart3 className="w-5 h-5" />} accent="purple" loading={isLoading} sub="summaries" /></motion.div>
          <motion.div variants={item}><StatCard label="Avg Compression" value={analytics ? `${Math.round((1 - analytics.avg_compression_ratio) * 100)}%` : '—'} icon={<Cpu className="w-5 h-5" />} accent="pink" loading={isLoading} sub="words saved" /></motion.div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Algorithm Distribution */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display font-semibold text-white mb-5 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-brand-400" /> Algorithm Usage
          </h3>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
          ) : (
            <div className="space-y-3">
              {analytics?.algorithm_distribution?.map((a: any) => {
                const total = analytics.total_summaries || 1
                const pct = Math.round((a.count / total) * 100)
                return (
                  <div key={a.algorithm} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <AlgoBadge algorithm={a.algorithm} />
                      <span className="text-xs font-mono text-white/60">{a.count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full bg-brand-500" />
                    </div>
                  </div>
                )
              })}
              {(!analytics?.algorithm_distribution || analytics.algorithm_distribution.length === 0) && (
                <p className="text-sm text-white/30 text-center py-6">No data yet</p>
              )}
            </div>
          )}
        </div>

        {/* Daily Activity */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display font-semibold text-white mb-5 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-400" /> Daily Activity (14 days)
          </h3>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
              {analytics?.daily_activity?.length === 0 && (
                <p className="text-sm text-white/30 text-center py-6">No activity in the last 14 days</p>
              )}
              {analytics?.daily_activity?.map((d: any) => {
                const max = Math.max(...analytics.daily_activity.map((x: any) => x.count), 1)
                const pct = Math.round((d.count / max) * 100)
                return (
                  <div key={d.date} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-white/30 w-24 shrink-0">{d.date}</span>
                    <div className="flex-1 h-5 rounded bg-white/[0.04] overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded bg-brand-500/50" />
                    </div>
                    <span className="text-xs font-mono text-white/50 w-8 text-right">{d.count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
