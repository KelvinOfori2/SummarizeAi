import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { summariesApi } from '@/api/summaries'
import { Spinner, Skeleton, AlgoBadge, Modal } from '@/components/ui'
import { compressionPercent, downloadBlob } from '@/utils/helpers'
import toast from 'react-hot-toast'
import axios from 'axios'
import { Zap, Upload, FileText, X, ChevronDown, Copy, Download, BarChart2, Clock, Layers } from 'lucide-react'

const ALGORITHMS = [
  { id: 't5',      label: 'T5 (Generative)', desc: 'Abstractive summary using T5 model' },
  { id: 'tfidf',   label: 'TF-IDF',   desc: 'Good for technical and structured documents' },
  { id: 'lsa',     label: 'LSA',      desc: 'Captures latent semantic relationships'       },
  { id: 'lexrank', label: 'LexRank',  desc: 'Graph-based, works well for news & articles'  },
  { id: 'luhn',    label: 'Luhn',     desc: 'Heuristic, best for shorter focused text'      },
]

const PROCESSING_STEPS = [
  'Reading document…',
  'Tokenizing input…',
  'Generating abstractive summary…',
  'Decoding response…',
]

function ProcessingPanel() {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setStep(s => (s + 1) % PROCESSING_STEPS.length), 1800)
    return () => clearInterval(id)
  }, [])
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="bg-dark-900 border border-dark-800 rounded-lg p-6 flex flex-col items-center gap-4">
      <Spinner size="lg" />
      <AnimatePresence mode="wait">
        <motion.p key={step} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }} className="text-sm text-white/40 font-mono">
          {PROCESSING_STEPS[step]}
        </motion.p>
      </AnimatePresence>
      <div className="w-full max-w-xs space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </motion.div>
  )
}

export default function Summarize() {
  const [tab, setTab] = useState<'text' | 'file'>('text')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [algorithm, setAlgorithm] = useState('t5')
  const [ratio, setRatio] = useState(0.3)
  const [title, setTitle] = useState('')
  const [result, setResult] = useState<any>(null)
  const [showAlgoMenu, setShowAlgoMenu] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length

  useEffect(() => {
    const handleWSSummary = (e: any) => {
      setResult(e.detail)
      setIsWaiting(false)
      toast.success('Done')
    }
    window.addEventListener('summary_created', handleWSSummary)
    return () => window.removeEventListener('summary_created', handleWSSummary)
  }, [])

  const textMutation = useMutation({
    mutationFn: () => summariesApi.create({ text, algorithm, summary_ratio: ratio, title: title || undefined }),
    onSuccess: (res) => { 
      if (res.data?.status === 'processing') setIsWaiting(true)
      else { setResult(res.data); toast.success('Done') }
    },
    onError: (err) => { 
      setIsWaiting(false)
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.detail || 'Failed')
      else toast.error('Something went wrong') 
    },
  })
  const fileMutation = useMutation({
    mutationFn: () => summariesApi.uploadFile(file!, algorithm, ratio, title || undefined),
    onSuccess: (res) => { 
      if (res.data?.status === 'processing') setIsWaiting(true)
      else { setResult(res.data); toast.success('Done') }
    },
    onError: (err) => { 
      setIsWaiting(false)
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.detail || 'Failed')
      else toast.error('Something went wrong') 
    },
  })

  const loading = textMutation.isPending || fileMutation.isPending || isWaiting

  const handleSubmit = () => {
    setResult(null)
    if (tab === 'text') {
      if (text.trim().length < 50) { toast.error('Text is too short (minimum 50 characters)'); return }
      textMutation.mutate()
    } else {
      if (!file) { toast.error('Select a file first'); return }
      fileMutation.mutate()
    }
  }

  const handleExport = async (format: 'txt' | 'pdf' | 'docx') => {
    if (!result) return
    try {
      const res = await summariesApi.export(result.id, format)
      downloadBlob(res.data, `summary_${result.id.slice(0, 8)}.${format}`)
      toast.success(`Exported as .${format}`)
      setShowExportModal(false)
    } catch { toast.error('Export failed') }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-display font-semibold text-2xl text-white">New summary</h1>
        <p className="text-sm text-white/40 mt-0.5">Paste text or upload a document.</p>
      </div>

      {/* Input card */}
      <div className="bg-dark-900 border border-dark-800 rounded-lg p-5">
        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-dark-800 pb-3">
          {(['text', 'file'] as const).map(t => (
            <button key={t} disabled={loading} onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed
                ${tab === t
                  ? 'bg-dark-800 text-white'
                  : 'text-white/35 hover:text-white/70 hover:bg-dark-800/50'}`}>
              {t === 'text' ? <><FileText className="w-3.5 h-3.5" />Text</> : <><Upload className="w-3.5 h-3.5" />File</>}
            </button>
          ))}
        </div>

        {tab === 'text' ? (
          <div>
            <textarea value={text} onChange={e => setText(e.target.value)} disabled={loading}
              placeholder="Paste your document text here…"
              rows={8} className="input-field resize-none font-body leading-relaxed disabled:opacity-50" />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-white/25 font-mono">{wordCount} words</span>
              {text && (
                <button onClick={() => setText('')} disabled={loading}
                  className="text-xs text-white/25 hover:text-red-400 transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed">
                  <X className="w-3 h-3" />Clear
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <input ref={fileRef} type="file" accept=".txt,.pdf,.docx" className="hidden" disabled={loading}
              onChange={e => setFile(e.target.files?.[0] || null)} />
            {file ? (
              <div className="flex items-center gap-3 p-3.5 rounded-lg border border-dark-700 bg-dark-800">
                <FileText className="w-6 h-6 text-white/30 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{file.name}</p>
                  <p className="text-xs text-white/30 font-mono">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button onClick={() => setFile(null)} disabled={loading}
                  className="p-1.5 rounded hover:bg-dark-700 text-white/30 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} disabled={loading}
                className="w-full border border-dashed border-dark-700 hover:border-brand-500/40 rounded-lg p-10 flex flex-col items-center gap-3 transition-colors duration-150 hover:bg-dark-800/40 group disabled:opacity-40 disabled:cursor-not-allowed">
                <Upload className="w-6 h-6 text-white/20 group-hover:text-brand-400 transition-colors" />
                <div className="text-center">
                  <p className="text-sm text-white/40">Click to upload</p>
                  <p className="text-xs text-white/25 mt-1 font-mono">TXT · PDF · DOCX (max 10 MB)</p>
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Algorithm */}
        <div className="relative">
          <label className="label">Algorithm</label>
          <button onClick={() => setShowAlgoMenu(!showAlgoMenu)} disabled={loading}
            className="input-field flex items-center justify-between text-left disabled:opacity-40 disabled:cursor-not-allowed">
            <span className="text-white text-sm">{ALGORITHMS.find(a => a.id === algorithm)?.label}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform ${showAlgoMenu ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showAlgoMenu && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.1 }}
                className="absolute z-30 top-full mt-1 w-full bg-dark-900 border border-dark-700 rounded-lg overflow-hidden shadow-modal">
                {ALGORITHMS.map(a => (
                  <button key={a.id} onClick={() => { setAlgorithm(a.id); setShowAlgoMenu(false) }}
                    className={`w-full text-left px-4 py-3 hover:bg-dark-800 transition-colors ${algorithm === a.id ? 'bg-dark-800' : ''}`}>
                    <div className="flex items-center gap-2">
                      <AlgoBadge algorithm={a.id} />
                      {algorithm === a.id && <span className="text-xs text-brand-400 font-mono">✓</span>}
                    </div>
                    <p className="text-xs text-white/35 mt-1">{a.desc}</p>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Ratio */}
        <div>
          <label className="label">
            Length: <span className="text-brand-400 font-mono normal-case tracking-normal">{Math.round(ratio * 100)}%</span>
          </label>
          <div className="flex items-center gap-2 mt-3.5">
            <span className="text-xs text-white/25 font-mono">5%</span>
            <input type="range" min={0.05} max={0.95} step={0.05} value={ratio} disabled={loading}
              onChange={e => setRatio(parseFloat(e.target.value))}
              className="flex-1 accent-brand-500 cursor-pointer h-px disabled:opacity-40 disabled:cursor-not-allowed" />
            <span className="text-xs text-white/25 font-mono">95%</span>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="label">Title (optional)</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} disabled={loading}
            placeholder="Untitled" className="input-field disabled:opacity-50" />
        </div>
      </div>

      {/* Submit */}
      <button onClick={handleSubmit} disabled={loading}
        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5">
        {loading ? <><Spinner size="sm" />Summarizing…</> : <><Zap className="w-4 h-4" />Summarize</>}
      </button>

      {/* Processing */}
      <AnimatePresence>
        {loading && <ProcessingPanel />}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {!loading && result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-3">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { icon: <Layers className="w-3.5 h-3.5" />,   label: 'Original', value: `${result.original_word_count}w` },
                { icon: <FileText className="w-3.5 h-3.5" />, label: 'Summary',  value: `${result.summary_word_count}w`  },
                { icon: <BarChart2 className="w-3.5 h-3.5" />,label: 'Saved',    value: compressionPercent(result.compression_ratio) },
                { icon: <Clock className="w-3.5 h-3.5" />,    label: 'Time',     value: `${result.processing_time}s`     },
              ].map(s => (
                <div key={s.label} className="bg-dark-900 border border-dark-800 rounded-lg p-3 flex items-center gap-2">
                  <span className="text-white/25 shrink-0">{s.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs text-white/30">{s.label}</p>
                    <p className="text-sm font-mono font-medium text-white truncate">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary text */}
            <div className="bg-dark-900 border border-dark-800 rounded-lg p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-dark-800">
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold text-white text-sm">Summary</span>
                  <AlgoBadge algorithm={result.algorithm} />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { navigator.clipboard.writeText(result.summary_text); toast.success('Copied') }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-dark-700 text-xs text-white/40 hover:text-white hover:border-dark-600 transition-colors">
                    <Copy className="w-3 h-3" />Copy
                  </button>
                  <button onClick={() => setShowExportModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-brand-500/30 bg-brand-500/10 text-xs text-brand-400 hover:bg-brand-500/20 transition-colors">
                    <Download className="w-3 h-3" />Export
                  </button>
                </div>
              </div>
              <p className="text-white/80 leading-relaxed text-sm whitespace-pre-wrap font-body">{result.summary_text}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Modal */}
      <Modal open={showExportModal} onClose={() => setShowExportModal(false)} title="Export summary">
        <p className="text-sm text-white/40 mb-4">Choose a download format.</p>
        <div className="space-y-1.5">
          {([
            ['txt',  'Plain text (.txt)',     'Universally compatible'],
            ['pdf',  'PDF document (.pdf)',   'Formatted with metadata'],
            ['docx', 'Word document (.docx)', 'Editable in Microsoft Word'],
          ] as const).map(([fmt, label, desc]) => (
            <button key={fmt} onClick={() => handleExport(fmt as any)}
              className="w-full bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-lg p-3.5 text-left flex items-start gap-3 transition-colors">
              <Download className="w-3.5 h-3.5 text-white/30 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-white">{label}</p>
                <p className="text-xs text-white/35">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
