import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, FileText, BarChart3, Download, Shield, ChevronDown, ArrowRight } from 'lucide-react'

const FEATURES = [
  { icon: Zap,       title: 'Four NLP algorithms',    desc: 'TF-IDF, LSA, LexRank, and Luhn, each suited to a different document type. When in doubt, TF-IDF is a good starting point.' },
  { icon: FileText,  title: 'Text, PDF, and DOCX',    desc: 'Paste raw text or upload a file up to 10 MB. Text is extracted automatically and cleaned before processing.' },
  { icon: BarChart3, title: 'Compression stats',      desc: 'See exactly how many words were removed, what ratio was applied, and how long processing took.' },
  { icon: Download,  title: 'Export in three formats', desc: 'Download as PDF, DOCX, or plain text. Exports include the algorithm used and compression metadata.' },
  { icon: Shield,    title: 'Per-account history',    desc: 'Every summary is stored under your account. Search past summaries, revisit results, or delete them at any time.' },
]

const FAQS = [
  { q: 'What is extractive summarization?', a: 'Extractive summarization selects actual sentences from the original text rather than generating new ones. The output is factually consistent with the source because every sentence in the summary appeared verbatim in your document.' },
  { q: 'Which algorithm should I use?', a: 'TF-IDF works well for technical documents. LSA captures semantic relationships across a document. LexRank is suited to news articles and longer prose. Luhn is a simple heuristic that performs well on short, focused text. When in doubt, try TF-IDF first.' },
  { q: 'What file types are supported?', a: 'TXT, PDF, and DOCX up to 10 MB. PDFs must have selectable text; scanned image PDFs will not produce usable output.' },
  { q: 'Can I export my summaries?', a: 'Yes. Each summary can be exported as a PDF, a DOCX Word document, or a plain text file. Exports include the algorithm name, compression ratio, and processing time.' },
]

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-dark-950 text-white overflow-x-hidden">

      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-dark-950/95 border-b border-dark-800 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-brand-500 flex items-center justify-center">
              <Zap className="w-3 h-3 text-dark-950" />
            </div>
            <span className="font-display font-semibold text-white text-sm">SummarizeAI</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/40">
            <a href="#features"    className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works"className="hover:text-white transition-colors">How it works</a>
            <a href="#faq"         className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login"    className="btn-ghost text-sm px-4 py-2">Sign in</Link>
            <Link to="/register" className="btn-primary text-sm px-4 py-2">Get started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <p className="text-xs font-mono text-white/30 mb-4 uppercase tracking-widest">
              Automatic Text Summarization
            </p>
            <h1 className="font-display font-semibold text-4xl md:text-5xl leading-tight text-white mb-5">
              Read less.<br />
              <span className="text-brand-400">Understand more.</span>
            </h1>
            <p className="text-base text-white/50 max-w-xl leading-relaxed mb-8">
              Upload a document or paste text. Choose from four NLP algorithms. Get a condensed
              summary made up entirely of sentences from your document. Nothing is generated or rewritten.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register" className="btn-primary px-6 py-2.5">
                Create a free account <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link to="/login" className="btn-ghost px-6 py-2.5">
                Sign in
              </Link>
            </div>
          </motion.div>

          {/* Hero stats — 3 honest numbers */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.3 }}
            className="flex flex-wrap gap-8 mt-14 pt-10 border-t border-dark-800">
            {[
              ['4',    'Summarization algorithms'],
              ['3',    'Export formats'],
              ['10MB', 'Maximum file size'],
            ].map(([v, l]) => (
              <div key={l}>
                <div className="font-display font-semibold text-2xl text-brand-400">{v}</div>
                <div className="text-xs text-white/35 mt-0.5">{l}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 border-t border-dark-800">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <h2 className="font-display font-semibold text-2xl text-white mb-2">What it does</h2>
            <p className="text-sm text-white/40">A focused set of tools for document summarization.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title}
                className="bg-dark-900 border border-dark-800 hover:border-dark-700 rounded-lg p-5 transition-colors duration-150">
                <div className="w-8 h-8 rounded border border-dark-700 flex items-center justify-center text-white/30 mb-4">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-body font-semibold text-white text-sm mb-2">{title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-6 border-t border-dark-800">
        <div className="max-w-3xl mx-auto">
          <div className="mb-12">
            <h2 className="font-display font-semibold text-2xl text-white mb-2">How it works</h2>
          </div>
          <div className="space-y-0">
            {[
              { title: 'Upload your document',  desc: 'Paste text or upload a TXT, PDF, or DOCX file.' },
              { title: 'Choose an algorithm',   desc: 'Select TF-IDF, LSA, LexRank, or Luhn. Adjust the target length.' },
              { title: 'Get your summary',      desc: 'Receive the condensed output with statistics. Export or save to history.' },
            ].map((s, i) => (
              <div key={s.title} className="flex gap-5 py-6 border-b border-dark-800 last:border-0">
                <div className="w-6 h-6 rounded border border-dark-700 flex items-center justify-center text-xs font-mono text-white/30 shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-body font-semibold text-white text-sm mb-1">{s.title}</h3>
                  <p className="text-xs text-white/40 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6 border-t border-dark-800">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <h2 className="font-display font-semibold text-2xl text-white mb-2">Frequently asked</h2>
          </div>
          <div className="space-y-0">
            {FAQS.map((faq, i) => (
              <div key={i} className="border-b border-dark-800 last:border-0">
                <button
                  className="w-full flex items-center justify-between py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="font-body font-medium text-white text-sm pr-4">{faq.q}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-white/30 shrink-0 transition-transform duration-150 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="pb-4 text-sm text-white/45 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-dark-800">
        <div className="max-w-3xl mx-auto">
          <div className="bg-dark-900 border border-dark-800 rounded-lg p-10 text-center">
            <h2 className="font-display font-semibold text-2xl text-white mb-3">Start summarizing</h2>
            <p className="text-sm text-white/40 mb-7 max-w-md mx-auto">
              Create a free account and run your first summary in under a minute.
            </p>
            <Link to="/register" className="btn-primary px-8 py-2.5">
              Create account <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-dark-800">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-brand-500 flex items-center justify-center">
              <Zap className="w-2.5 h-2.5 text-dark-950" />
            </div>
            <span className="font-display font-semibold text-xs text-white/40">SummarizeAI</span>
          </div>
          <p className="text-xs text-white/25">Final year project: Automatic Text Summarization System Using NLP</p>
          <div className="flex gap-4 text-xs text-white/25">
            <Link to="/login"    className="hover:text-white transition-colors">Sign in</Link>
            <Link to="/register" className="hover:text-white transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
