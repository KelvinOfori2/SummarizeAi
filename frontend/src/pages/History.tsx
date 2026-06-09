import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { summariesApi } from '@/api/summaries'
import { AlgoBadge, EmptyState, Spinner, Modal } from '@/components/ui'
import { compressionPercent, formatDateTime, downloadBlob } from '@/utils/helpers'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import {
  Search, Trash2, Download, ChevronLeft, ChevronRight,
  FileText, Zap, Clock, BarChart2, X, Eye,
} from 'lucide-react'

export default function History() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [viewTarget, setViewTarget] = useState<any | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['summaries', page, 10, search],
    queryFn: () => summariesApi.list(page, 10, search || undefined).then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => summariesApi.delete(id),
    onSuccess: () => {
      toast.success('Summary deleted')
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ['summaries'] })
      qc.invalidateQueries({ queryKey: ['user-stats'] })
    },
    onError: () => toast.error('Failed to delete'),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleExport = async (id: string, format: 'txt' | 'pdf' | 'docx') => {
    try {
      const res = await summariesApi.export(id, format)
      downloadBlob(res.data, `summary_${id.slice(0, 8)}.${format}`)
      toast.success(`Exported as ${format.toUpperCase()}`)
    } catch {
      toast.error('Export failed')
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-mono text-brand-400 uppercase tracking-widest mb-1">Library</p>
        <h1 className="font-display font-bold text-3xl text-white">Summary History</h1>
        <p className="text-white/40 mt-1">Browse, search, and manage all your generated summaries.</p>
      </motion.div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder="Search summaries..." className="input-field pl-10" />
        </div>
        <button type="submit" className="btn-primary px-5 py-2.5 text-sm">Search</button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
            className="btn-ghost px-4 py-2.5 text-sm">
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </form>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : data?.items?.length === 0 ? (
        <EmptyState icon={<FileText className="w-7 h-7" />}
          title={search ? 'No results found' : 'No summaries yet'}
          description={search ? 'Try a different search term.' : 'Your generated summaries will appear here.'}
          action={!search ? <Link to="/summarize" className="btn-primary text-sm px-5 py-2.5"><Zap className="w-4 h-4" />Create Summary</Link> : undefined} />
      ) : (
        <>
          <div className="space-y-3">
            {data?.items?.map((s: any, i: number) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass glass-hover rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4">

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <AlgoBadge algorithm={s.algorithm} />
                    <span className="text-xs text-white/30 font-mono">{s.source_type}</span>
                  </div>
                  <h3 className="font-medium text-white truncate">{s.title || 'Untitled'}</h3>
                  {s.file_name && <p className="text-xs text-white/30 mt-0.5 truncate">{s.file_name}</p>}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-white/40">
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{s.original_word_count} → {s.summary_word_count} words</span>
                    <span className="flex items-center gap-1"><BarChart2 className="w-3 h-3" />{compressionPercent(s.compression_ratio)} saved</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDateTime(s.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => summariesApi.get(s.id).then(r => setViewTarget(r.data))}
                    className="p-2 rounded-lg glass text-white/40 hover:text-white transition-all" title="View">
                    <Eye className="w-4 h-4" />
                  </button>
                  <div className="relative group">
                    <button className="p-2 rounded-lg glass text-white/40 hover:text-brand-400 transition-all" title="Export">
                      <Download className="w-4 h-4" />
                    </button>
                    <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col glass rounded-xl border border-white/10 overflow-hidden shadow-2xl z-10 w-32">
                      {(['txt','pdf','docx'] as const).map(fmt => (
                        <button key={fmt} onClick={() => handleExport(s.id, fmt)}
                          className="px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors text-left uppercase font-mono">
                          .{fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setDeleteTarget(s.id)}
                    className="p-2 rounded-lg glass text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {data?.total_pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-white/40">
                Page {data.page} of {data.total_pages} · {data.total} summaries
              </p>
              <div className="flex items-center gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="p-2 rounded-lg glass text-white/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(data.total_pages, 5) }, (_, i) => {
                  const p = i + 1
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-mono transition-all
                        ${page === p ? 'bg-brand-500 text-dark-950 font-bold' : 'glass text-white/40 hover:text-white'}`}>
                      {p}
                    </button>
                  )
                })}
                <button disabled={page === data.total_pages} onClick={() => setPage(p => p + 1)}
                  className="p-2 rounded-lg glass text-white/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete confirm modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Summary" danger>
        <p className="text-sm text-white/60 mb-6">This action cannot be undone. The summary will be permanently deleted.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setDeleteTarget(null)} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
          <button onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
            disabled={deleteMutation.isPending}
            className="btn-danger px-4 py-2 text-sm">
            {deleteMutation.isPending ? <Spinner size="sm" /> : <><Trash2 className="w-4 h-4" />Delete</>}
          </button>
        </div>
      </Modal>

      {/* View modal */}
      <AnimatePresence>
        {viewTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setViewTarget(null)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="relative glass rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-white">{viewTarget.title || 'Summary'}</h3>
                  <AlgoBadge algorithm={viewTarget.algorithm} />
                </div>
                <button onClick={() => setViewTarget(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4 text-xs font-mono">
                <div className="glass rounded-lg p-2 text-center">
                  <div className="text-white/40">Original</div>
                  <div className="text-white font-bold">{viewTarget.original_word_count}w</div>
                </div>
                <div className="glass rounded-lg p-2 text-center">
                  <div className="text-white/40">Summary</div>
                  <div className="text-white font-bold">{viewTarget.summary_word_count}w</div>
                </div>
                <div className="glass rounded-lg p-2 text-center">
                  <div className="text-white/40">Saved</div>
                  <div className="text-brand-400 font-bold">{compressionPercent(viewTarget.compression_ratio)}</div>
                </div>
              </div>
              <h4 className="text-xs font-mono text-white/40 uppercase tracking-wider mb-2">Summary</h4>
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{viewTarget.summary_text}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
