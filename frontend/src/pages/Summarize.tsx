import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { summariesApi } from '@/api/summaries'
import { Spinner, AlgoBadge, Modal } from '@/components/ui'
import { compressionPercent, downloadBlob } from '@/utils/helpers'
import toast from 'react-hot-toast'
import axios from 'axios'
import { Zap, Upload, FileText, X, ChevronDown, Copy, Download, BarChart2, Clock, Layers } from 'lucide-react'

const ALGORITHMS = [
  { id: 'tfidf',   label: 'TF-IDF',  desc: 'Best for technical docs' },
  { id: 'lsa',     label: 'LSA',     desc: 'Semantic relationships'  },
  { id: 'lexrank', label: 'LexRank', desc: 'News & articles'         },
  { id: 'luhn',    label: 'Luhn',    desc: 'Short focused text'      },
]

export default function Summarize() {
  const [tab, setTab] = useState<'text'|'file'>('text')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File|null>(null)
  const [algorithm, setAlgorithm] = useState('tfidf')
  const [ratio, setRatio] = useState(0.3)
  const [title, setTitle] = useState('')
  const [result, setResult] = useState<any>(null)
  const [showAlgoMenu, setShowAlgoMenu] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length

  const textMutation = useMutation({
    mutationFn: () => summariesApi.create({ text, algorithm, summary_ratio: ratio, title: title || undefined }),
    onSuccess: (res) => { setResult(res.data); toast.success('Summary generated!') },
    onError: (err) => { if (axios.isAxiosError(err)) toast.error(err.response?.data?.detail || 'Failed'); else toast.error('Error occurred') },
  })
  const fileMutation = useMutation({
    mutationFn: () => summariesApi.uploadFile(file!, algorithm, ratio, title || undefined),
    onSuccess: (res) => { setResult(res.data); toast.success('Summary generated!') },
    onError: (err) => { if (axios.isAxiosError(err)) toast.error(err.response?.data?.detail || 'Failed'); else toast.error('Error occurred') },
  })

  const loading = textMutation.isPending || fileMutation.isPending

  const handleSubmit = () => {
    if (tab === 'text') { if (text.trim().length < 50) { toast.error('Text too short (min 50 chars)'); return }; textMutation.mutate() }
    else { if (!file) { toast.error('Please select a file'); return }; fileMutation.mutate() }
  }

  const handleExport = async (format: 'txt'|'pdf'|'docx') => {
    if (!result) return
    try {
      const res = await summariesApi.export(result.id, format)
      downloadBlob(res.data, `summary_${result.id.slice(0,8)}.${format}`)
      toast.success(`Exported as ${format.toUpperCase()}`)
      setShowExportModal(false)
    } catch { toast.error('Export failed') }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-mono text-brand-400 uppercase tracking-widest mb-1">NLP Engine</p>
        <h1 className="font-display font-bold text-2xl md:text-3xl text-white">Summarize Text</h1>
        <p className="text-white/40 mt-1 text-sm">Paste text or upload a document to generate an AI-powered summary.</p>
      </motion.div>

      {/* Input */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-4 md:p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['text','file'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 touch-target
                ${tab === t ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-white/40 hover:text-white glass'}`}>
              {t === 'text' ? <><FileText className="w-4 h-4 inline mr-1.5" />Text</> : <><Upload className="w-4 h-4 inline mr-1.5" />File</>}
            </button>
          ))}
        </div>

        {tab === 'text' ? (
          <div>
            <textarea value={text} onChange={e => setText(e.target.value)}
              placeholder="Paste your text here... (minimum 50 characters)"
              rows={6} className="input-field resize-none font-body leading-relaxed" />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-white/30 font-mono">{wordCount} words</span>
              {text && <button onClick={() => setText('')} className="text-xs text-white/30 hover:text-red-400 transition-colors flex items-center gap-1"><X className="w-3 h-3"/>Clear</button>}
            </div>
          </div>
        ) : (
          <div>
            <input ref={fileRef} type="file" accept=".txt,.pdf,.docx" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            {file ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-500/10 border border-brand-500/20">
                <FileText className="w-8 h-8 text-brand-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{file.name}</p>
                  <p className="text-xs text-white/40">{(file.size/1024).toFixed(1)} KB</p>
                </div>
                <button onClick={() => setFile(null)} className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white touch-target"><X className="w-4 h-4"/></button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-white/10 hover:border-brand-500/40 rounded-xl p-8 flex flex-col items-center gap-3 transition-all hover:bg-brand-500/5 group touch-target">
                <Upload className="w-8 h-8 text-white/20 group-hover:text-brand-400 transition-colors" />
                <div className="text-center">
                  <p className="text-sm text-white/50">Tap to upload</p>
                  <p className="text-xs text-white/30 mt-1">TXT, PDF, DOCX — up to 10MB</p>
                </div>
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Options */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Algorithm */}
        <div className="relative">
          <label className="label">Algorithm</label>
          <button onClick={() => setShowAlgoMenu(!showAlgoMenu)} className="input-field flex items-center justify-between text-left touch-target">
            <span className="font-medium text-white text-sm">{ALGORITHMS.find(a=>a.id===algorithm)?.label}</span>
            <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${showAlgoMenu?'rotate-180':''}`} />
          </button>
          <AnimatePresence>
            {showAlgoMenu && (
              <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                className="absolute z-30 top-full mt-1 w-full glass rounded-xl border border-white/10 overflow-hidden shadow-2xl">
                {ALGORITHMS.map(a => (
                  <button key={a.id} onClick={() => { setAlgorithm(a.id); setShowAlgoMenu(false) }}
                    className={`w-full text-left px-4 py-3 hover:bg-white/[0.05] transition-colors touch-target ${algorithm===a.id?'bg-brand-500/10':''}`}>
                    <div className="flex items-center gap-2">
                      <AlgoBadge algorithm={a.id} />
                      {algorithm===a.id && <span className="text-xs text-brand-400">✓</span>}
                    </div>
                    <p className="text-xs text-white/40 mt-1">{a.desc}</p>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Ratio */}
        <div>
          <label className="label">Length — <span className="text-brand-400 font-mono">{Math.round(ratio*100)}%</span></label>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-white/30 font-mono">5%</span>
            <input type="range" min={0.05} max={0.95} step={0.05} value={ratio}
              onChange={e => setRatio(parseFloat(e.target.value))}
              className="flex-1 accent-brand-500 cursor-pointer" style={{height:'4px'}} />
            <span className="text-xs text-white/30 font-mono">95%</span>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="label">Title (optional)</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="My summary..." className="input-field" />
        </div>
      </motion.div>

      {/* Submit */}
      <button onClick={handleSubmit} disabled={loading}
        className="btn-primary w-full sm:w-auto text-base px-8 py-3.5 shadow-neon-teal disabled:opacity-60 disabled:cursor-not-allowed touch-target">
        {loading ? <><Spinner size="sm"/>Generating...</> : <><Zap className="w-5 h-5"/>Generate Summary</>}
      </button>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {icon:<Layers className="w-4 h-4"/>, label:'Original', value:`${result.original_word_count}w`},
                {icon:<FileText className="w-4 h-4"/>, label:'Summary', value:`${result.summary_word_count}w`},
                {icon:<BarChart2 className="w-4 h-4"/>, label:'Saved', value:compressionPercent(result.compression_ratio)},
                {icon:<Clock className="w-4 h-4"/>, label:'Time', value:`${result.processing_time}s`},
              ].map(s => (
                <div key={s.label} className="glass rounded-xl p-3 flex items-center gap-2">
                  <span className="text-brand-400 shrink-0">{s.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs text-white/40">{s.label}</p>
                    <p className="text-sm font-mono font-medium text-white truncate">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary text */}
            <div className="glass rounded-2xl p-4 md:p-6 border border-brand-500/20">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-semibold text-white">Summary</h3>
                  <AlgoBadge algorithm={result.algorithm} />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(result.summary_text); toast.success('Copied!') }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg glass text-xs text-white/60 hover:text-white transition-all touch-target">
                    <Copy className="w-3.5 h-3.5"/>Copy
                  </button>
                  <button onClick={() => setShowExportModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-500/20 border border-brand-500/30 text-xs text-brand-400 hover:bg-brand-500/30 transition-all touch-target">
                    <Download className="w-3.5 h-3.5"/>Export
                  </button>
                </div>
              </div>
              <p className="text-white/80 leading-relaxed text-sm whitespace-pre-wrap">{result.summary_text}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Modal */}
      <Modal open={showExportModal} onClose={() => setShowExportModal(false)} title="Export Summary">
        <p className="text-sm text-white/50 mb-4">Choose a format to download your summary.</p>
        <div className="space-y-2">
          {([['txt','Plain Text (.txt)','Universally compatible'],['pdf','PDF Document (.pdf)','Formatted with metadata'],['docx','Word Document (.docx)','Editable in Microsoft Word']] as const).map(([fmt,label,desc]) => (
            <button key={fmt} onClick={() => handleExport(fmt as any)}
              className="w-full glass glass-hover rounded-xl p-4 text-left flex items-start gap-3 touch-target">
              <Download className="w-4 h-4 text-brand-400 mt-0.5 shrink-0"/>
              <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-white/40">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
