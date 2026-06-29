import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { usersApi } from '@/api/users'
import { summariesApi } from '@/api/summaries'
import { useAuthStore } from '@/store/authStore'
import { StatCard, Skeleton, AlgoBadge, EmptyState } from '@/components/ui'
import { formatNumber, timeAgo, compressionPercent } from '@/utils/helpers'
import { FileText, Zap, BookOpen, TrendingUp, Clock, ArrowRight, History } from 'lucide-react'

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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-display font-semibold text-2xl text-white">
          {user?.username}
        </h1>
        <p className="text-sm text-white/40 mt-0.5">Your summarization workspace</p>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        {[
          { label: 'Total Summaries', value: formatNumber(stats?.total_summaries ?? 0),       icon: <FileText className="w-4 h-4" />, sub: 'all time'   },
          { label: 'Words Processed', value: formatNumber(stats?.total_words_processed ?? 0), icon: <BookOpen className="w-4 h-4" />, sub: 'input'      },
          { label: 'Words Saved',     value: formatNumber(stats?.total_words_saved ?? 0),     icon: <TrendingUp className="w-4 h-4" />, sub: 'compressed' },
          { label: 'Last Active',     value: stats?.last_activity ? timeAgo(stats.last_activity) : '—', icon: <Clock className="w-4 h-4" /> },
        ].map((s) => (
          <StatCard key={s.label} {...s} loading={statsLoading} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Summaries */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-lg text-white">Recent summaries</h2>
            <Link to="/history" className="text-xs text-white/40 hover:text-brand-400 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {summariesLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
          ) : summaries?.items?.length === 0 ? (
            <EmptyState icon={<FileText className="w-5 h-5" />} title="No summaries yet"
              description="Create your first summary to see it here."
              action={<Link to="/summarize" className="btn-primary text-sm px-4 py-2"><Zap className="w-3.5 h-3.5" />New summary</Link>} />
          ) : (
            <div className="space-y-1.5">
              {summaries?.items?.map((s: any, i: number) => (
                <div key={s.id}
                  className="bg-dark-900 border border-dark-800 hover:border-dark-700 rounded-lg px-4 py-3 transition-colors duration-150">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <AlgoBadge algorithm={s.algorithm} />
                        <span className="text-xs text-white/25 font-mono">{timeAgo(s.created_at)}</span>
                      </div>
                      <p className="text-sm text-white truncate">{s.title || 'Untitled'}</p>
                      <p className="text-xs text-white/30 mt-0.5 font-mono">
                        {s.original_word_count} → {s.summary_word_count} words · {compressionPercent(s.compression_ratio)} saved
                      </p>
                    </div>
                    <Link to="/history" className="shrink-0 p-1 rounded hover:bg-dark-800 text-white/20 hover:text-white/60 transition-colors">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions + Activity */}
        <div className="space-y-5">
          <div>
            <h2 className="font-display font-semibold text-base text-white mb-2">Quick actions</h2>
            <div className="space-y-1.5">
              {[
                { to: '/summarize', icon: Zap,     label: 'New summary',  sub: 'Paste text or upload a file' },
                { to: '/history',   icon: History, label: 'History',      sub: 'Browse past summaries'       },
              ].map(({ to, icon: Icon, label, sub }) => (
                <Link key={to} to={to}
                  className="bg-dark-900 border border-dark-800 hover:border-dark-700 rounded-lg p-3.5 flex items-center gap-3 group transition-colors duration-150">
                  <div className="w-8 h-8 rounded border border-dark-700 flex items-center justify-center text-white/30 group-hover:text-brand-400 group-hover:border-brand-500/30 transition-colors shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-xs text-white/30">{sub}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/40 transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-display font-semibold text-base text-white mb-2">Activity</h2>
            <div className="space-y-0">
              {activity?.slice(0, 5).map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 py-2 border-b border-dark-800 last:border-0">
                  <div className="w-1 h-1 rounded-full bg-brand-500/60 shrink-0" />
                  <p className="text-xs text-white/50 flex-1 capitalize">{log.action.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-white/25 font-mono shrink-0">{timeAgo(log.created_at)}</p>
                </div>
              ))}
              {(!activity || activity.length === 0) && (
                <p className="text-xs text-white/25 py-3">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
