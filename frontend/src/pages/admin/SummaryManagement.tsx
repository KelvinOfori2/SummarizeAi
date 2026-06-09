import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { adminApi } from '@/api/admin'
import { Spinner, Modal, EmptyState, AlgoBadge } from '@/components/ui'
import { formatDateTime, compressionPercent } from '@/utils/helpers'
import toast from 'react-hot-toast'
import { Search, Trash2, FileText, X } from 'lucide-react'

export default function SummaryManagement() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-summaries', page, search],
    queryFn: () => adminApi.listSummaries(page, 20, search || undefined).then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteSummary(id),
    onSuccess: () => {
      toast.success('Summary deleted')
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ['admin-summaries'] })
      qc.invalidateQueries({ queryKey: ['admin-analytics'] })
    },
    onError: () => toast.error('Delete failed'),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-mono text-purple-400 uppercase tracking-widest mb-1">Admin</p>
        <h1 className="font-display font-bold text-3xl text-white">Summary Management</h1>
        <p className="text-white/40 mt-1">View and moderate all user-generated summaries.</p>
      </motion.div>

      <div className="flex gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-48">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Search summaries..." className="input-field pl-10" />
          </div>
          <button type="submit" className="btn-primary px-4 py-2.5 text-sm">Search</button>
        </form>
        {search && (
          <button onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
            className="btn-ghost px-4 py-2.5 text-sm">
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : data?.items?.length === 0 ? (
        <EmptyState icon={<FileText className="w-7 h-7" />} title="No summaries found" />
      ) : (
        <>
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Title', 'User ID', 'Algorithm', 'Words', 'Compressed', 'Type', 'Created', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-mono text-white/40 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.items?.map((s: any, i: number) => (
                    <motion.tr key={s.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors last:border-0">
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-white font-medium truncate">{s.title || 'Untitled'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-white/40 truncate max-w-[80px] block">{s.user_id?.slice(0, 8)}…</span>
                      </td>
                      <td className="px-4 py-3"><AlgoBadge algorithm={s.algorithm} /></td>
                      <td className="px-4 py-3 text-xs font-mono text-white/60">
                        {s.original_word_count} → {s.summary_word_count}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-brand-400">{compressionPercent(s.compression_ratio)} saved</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge badge-teal uppercase text-[10px]">{s.source_type}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-white/40 font-mono whitespace-nowrap">
                        {formatDateTime(s.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setDeleteTarget(s.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-white/40">
            <span>Total: {data?.total} summaries</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg glass text-xs disabled:opacity-30 hover:text-white transition-all">
                Previous
              </button>
              <span className="px-3 py-1.5 text-xs font-mono">Page {page}</span>
              <button disabled={data?.items?.length < 20} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg glass text-xs disabled:opacity-30 hover:text-white transition-all">
                Next
              </button>
            </div>
          </div>
        </>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Summary" danger>
        <p className="text-sm text-white/60 mb-6">This will permanently delete the summary and cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setDeleteTarget(null)} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
          <button onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
            disabled={deleteMutation.isPending} className="btn-danger">
            {deleteMutation.isPending ? <Spinner size="sm" /> : <><Trash2 className="w-4 h-4" />Delete</>}
          </button>
        </div>
      </Modal>
    </div>
  )
}
