import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { adminApi } from '@/api/admin'
import { Spinner, EmptyState } from '@/components/ui'
import { formatDateTime } from '@/utils/helpers'
import { ScrollText, ChevronLeft, ChevronRight } from 'lucide-react'

const ACTION_COLORS: Record<string, string> = {
  login:           'text-brand-400 bg-brand-500/10 border-brand-500/20',
  register:        'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  logout:          'text-white/40 bg-white/5 border-white/10',
  password_change: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  summarize:       'text-purple-400 bg-purple-500/10 border-purple-500/20',
  delete:          'text-red-400 bg-red-500/10 border-red-500/20',
}

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] || 'text-white/40 bg-white/5 border-white/10'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono border ${cls}`}>
      {action.replace(/_/g, ' ')}
    </span>
  )
}

export default function SystemLogs() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-logs', page],
    queryFn: () => adminApi.getLogs(page, 30).then(r => r.data),
    refetchInterval: 30_000,
  })

  const totalPages = data ? Math.ceil(data.total / 30) : 1

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-mono text-purple-400 uppercase tracking-widest mb-1">Admin</p>
        <h1 className="font-display font-bold text-3xl text-white">System Logs</h1>
        <p className="text-white/40 mt-1">
          User activity and login logs. Auto-refreshes every 30 seconds.
          {data && <span className="ml-2 text-brand-400 font-mono text-xs">{data.total} total entries</span>}
        </p>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : data?.items?.length === 0 ? (
        <EmptyState icon={<ScrollText className="w-7 h-7" />} title="No logs yet"
          description="Activity logs will appear here as users interact with the platform." />
      ) : (
        <>
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Time', 'User', 'Action', 'Description', 'IP Address'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-mono text-white/40 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.items?.map((log: any, i: number) => (
                    <motion.tr key={log.id}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors last:border-0">
                      <td className="px-4 py-3 text-xs font-mono text-white/40 whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-brand-500/20 flex items-center justify-center text-brand-400 text-xs font-bold">
                            {log.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span className="text-xs text-white/70 font-mono">
                            {log.username || <span className="text-white/30">deleted</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="px-4 py-3 text-xs text-white/50 max-w-xs truncate">
                        {log.description || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-white/30">
                        {log.ip_address || '—'}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/40 font-mono">
                Page {page} of {totalPages} · {data?.total} entries
              </p>
              <div className="flex items-center gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="p-2 rounded-lg glass text-white/40 hover:text-white disabled:opacity-30 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-mono transition-all
                      ${page === p ? 'bg-brand-500 text-dark-950 font-bold' : 'glass text-white/40 hover:text-white'}`}>
                    {p}
                  </button>
                ))}
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-2 rounded-lg glass text-white/40 hover:text-white disabled:opacity-30 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
