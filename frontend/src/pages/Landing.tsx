import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Zap, Brain, FileText, BarChart3, Download, Shield,
  ChevronDown, ArrowRight, Sparkles,
  CheckCircle2, Star,
} from 'lucide-react'

const FEATURES = [
  { icon: Brain,    title: 'AI-Powered NLP',      desc: 'Four extractive algorithms: TF-IDF, LSA, LexRank, and Luhn give you multiple perspectives on any document.', accent: 'brand' },
  { icon: Zap,      title: 'Instant Processing',   desc: 'Summaries generated in milliseconds. No waiting, no queues. Real-time compression ratio feedback.', accent: 'amber' },
  { icon: FileText, title: 'Any Format',            desc: 'Paste raw text or upload TXT, PDF, and DOCX files up to 10MB. We handle extraction automatically.', accent: 'purple' },
  { icon: BarChart3,title: 'Deep Analytics',        desc: 'Track words saved, compression ratios, algorithm performance, and your full summarization history.', accent: 'pink' },
  { icon: Download, title: 'Export Anywhere',       desc: 'Download summaries as PDF, DOCX, or plain text. Perfect for reports, presentations, and notes.', accent: 'brand' },
  { icon: Shield,   title: 'Secure & Private',      desc: 'JWT authentication, role-based access control, and encrypted data storage. Your documents are yours.', accent: 'amber' },
]

const STEPS = [
  { n: '01', title: 'Upload Your Document', desc: 'Paste text directly or upload a TXT, PDF, or DOCX file. We support documents of any length.' },
  { n: '02', title: 'Choose Your Algorithm', desc: 'Select from TF-IDF, LSA, LexRank, or Luhn. Adjust the compression ratio from 5% to 95%.' },
  { n: '03', title: 'Get Your Summary',      desc: 'Receive your AI-generated summary instantly with full statistics. Export or save to history.' },
]

const FAQS = [
  { q: 'What makes extractive summarization different from generative AI?', a: 'Extractive summarization selects actual sentences from the original text, ensuring 100% factual accuracy. No hallucinations, no invented content — just the most important sentences identified by our NLP algorithms.' },
  { q: 'Which algorithm should I use?', a: 'TF-IDF is great for technical documents. LSA captures semantic relationships. LexRank works well for news and articles. Luhn is ideal for shorter focused texts. Try all four with the comparison feature!' },
  { q: 'What file types and sizes are supported?', a: 'We support TXT, PDF, and DOCX files up to 10MB. For PDF files, the text must be selectable (not scanned images). DOCX files are fully supported including complex formatting.' },
  { q: 'Is my data secure?', a: 'All documents and summaries are stored encrypted and accessible only to you. We use JWT authentication, bcrypt password hashing, and follow OWASP security standards throughout.' },
  { q: 'Can I export my summaries?', a: 'Yes! Every summary can be exported as a formatted PDF, DOCX Word document, or plain text file. All exports include metadata like algorithm used, compression ratio, and processing time.' },
]

const ACCENT_MAP: Record<string, string> = {
  brand:  'from-brand-500/20 to-transparent border-brand-500/20 text-brand-400',
  amber:  'from-amber-500/20 to-transparent border-amber-500/20 text-amber-400',
  purple: 'from-purple-500/20 to-transparent border-purple-500/20 text-purple-400',
  pink:   'from-pink-500/20 to-transparent border-pink-500/20 text-pink-400',
}

function Orbs() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="orb w-96 h-96 bg-brand-500 top-[-10%] right-[10%]" style={{ opacity: 0.08 }} />
      <div className="orb w-72 h-72 bg-purple-500 bottom-[20%] left-[-5%]" style={{ opacity: 0.06 }} />
      <div className="orb w-64 h-64 bg-neon-cyan bottom-[10%] right-[20%]" style={{ opacity: 0.05 }} />
    </div>
  )
}

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80])
  const heroO = useTransform(scrollYProgress, [0, 0.6], [1, 0])
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }
  const item: any = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20 } } }

  return (
    <div className="relative min-h-screen bg-dark-950 text-white overflow-x-hidden">
      <Orbs />

      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-neon-teal">
              <Zap className="w-4 h-4 text-dark-950" />
            </div>
            <span className="font-display font-bold text-white">SummarizeAI</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/50">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-sm px-4 py-2">Log In</Link>
            <Link to="/register" className="btn-primary text-sm px-4 py-2">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative pt-32 pb-24 px-6">
        <motion.div style={{ y: heroY, opacity: heroO }} className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-brand-500/20 text-brand-400 text-xs font-mono mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            NLP-Powered Text Summarization — 4 Algorithms
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, type: 'spring', damping: 18 }}
            className="font-display font-extrabold text-5xl md:text-7xl leading-[1.05] mb-6">
            Understand Any Document
            <br />
            <span className="text-gradient">In Seconds</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            SummarizeAI uses advanced NLP algorithms to extract the most important sentences from any document.
            Paste text, upload files, compare algorithms — all in one intelligent platform.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="btn-primary text-base px-8 py-3.5 shadow-neon-teal">
              Start Summarizing Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="btn-ghost text-base px-8 py-3.5">
              Sign In
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="grid grid-cols-3 gap-6 max-w-lg mx-auto mt-16">
            {[['4', 'NLP Algorithms'], ['10MB', 'Max File Size'], ['3', 'Export Formats']].map(([v, l]) => (
              <div key={l} className="text-center">
                <div className="font-display font-bold text-3xl text-gradient">{v}</div>
                <div className="text-xs text-white/40 mt-0.5">{l}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Hero visual */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, type: 'spring', damping: 20 }}
          className="relative max-w-4xl mx-auto mt-16">
          <div className="glass rounded-3xl p-6 border border-white/[0.08] shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-amber-500/70" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
              <span className="ml-2 text-xs font-mono text-white/30">summarize.ai — dashboard</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[['TF-IDF','brand'],['LSA','purple'],['LexRank','amber']].map(([algo, color]) => (
                <div key={algo} className={`glass rounded-xl p-3 border border-${color === 'brand' ? 'brand' : color}-500/20`}>
                  <div className={`text-xs font-mono text-${color === 'brand' ? 'brand' : color}-400 mb-1`}>{algo}</div>
                  <div className="space-y-1.5">
                    <div className="skeleton h-2 w-full rounded" />
                    <div className="skeleton h-2 w-3/4 rounded" />
                    <div className="skeleton h-2 w-5/6 rounded" />
                  </div>
                </div>
              ))}
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-white/40">Generated Summary</span>
                <span className="badge badge-teal">72% compressed</span>
              </div>
              <div className="space-y-2">
                {[1, 0.85, 0.7].map((w, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="w-1 shrink-0 rounded-full bg-brand-500/40 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <div className={`h-2 rounded bg-brand-500/20`} style={{ width: `${w * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Glow under card */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-brand-500/20 blur-2xl rounded-full" />
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <p className="text-xs font-mono text-brand-400 uppercase tracking-widest mb-3">Capabilities</p>
            <h2 className="font-display font-bold text-4xl md:text-5xl mb-4">
              Everything You Need to <span className="text-gradient">Process Text</span>
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">A complete NLP toolkit wrapped in a premium interface.</p>
          </motion.div>

          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, accent }) => {
              const cls = ACCENT_MAP[accent]
              return (
                <motion.div key={title} variants={item}
                  className={`group relative glass glass-hover rounded-2xl p-6 border bg-gradient-to-br ${cls.split(' ').slice(0,2).join(' ')} ${cls.split(' ')[2]}`}>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cls.split(' ').slice(0,2).join(' ')} border ${cls.split(' ')[2]} flex items-center justify-center mb-4 ${cls.split(' ')[3]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-semibold text-white mb-2">{title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <p className="text-xs font-mono text-brand-400 uppercase tracking-widest mb-3">Process</p>
            <h2 className="font-display font-bold text-4xl md:text-5xl mb-4">
              Three Steps to <span className="text-gradient">Clarity</span>
            </h2>
          </motion.div>

          <div className="relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/20 to-transparent" />
            <div className="grid md:grid-cols-3 gap-8">
              {STEPS.map((s, i) => (
                <motion.div key={s.n} initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.15, type: 'spring', damping: 20 }}
                  className="relative text-center group">
                  <div className="w-16 h-16 rounded-2xl glass border border-brand-500/20 flex items-center justify-center mx-auto mb-6 group-hover:shadow-neon-teal transition-shadow duration-300">
                    <span className="font-display font-bold text-2xl text-gradient">{s.n}</span>
                  </div>
                  <h3 className="font-display font-semibold text-white mb-3">{s.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { text: 'Cut my research time in half. The LexRank algorithm finds exactly the right sentences every time.', name: 'Sarah K.', role: 'PhD Researcher' },
              { text: 'I use this daily for client documents. The PDF export is clean and professional. Highly recommended.', name: 'Marcus T.', role: 'Legal Analyst' },
              { text: 'Finally an NLP tool that shows its work. Seeing the algorithm comparison side-by-side is invaluable.', name: 'Priya M.', role: 'Data Scientist' },
            ].map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass glass-hover rounded-2xl p-6">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, j) => <Star key={j} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-sm text-white/60 leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-white/30">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-12">
            <h2 className="font-display font-bold text-4xl mb-4">Frequently Asked Questions</h2>
            <p className="text-white/50">Everything you need to know about SummarizeAI.</p>
          </motion.div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
                <button className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="font-display font-medium text-white pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-white/40 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="px-5 pb-5 text-sm text-white/50 leading-relaxed border-t border-white/[0.06] pt-4">
                    {faq.a}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center glass rounded-3xl p-12 border border-brand-500/20 relative overflow-hidden">
          <div className="orb w-64 h-64 bg-brand-500 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ opacity: 0.06 }} />
          <div className="relative">
            <CheckCircle2 className="w-12 h-12 text-brand-400 mx-auto mb-4" />
            <h2 className="font-display font-bold text-4xl mb-4">Ready to Start?</h2>
            <p className="text-white/50 mb-8">Create your free account and summarize your first document in minutes.</p>
            <Link to="/register" className="btn-primary text-base px-10 py-4 shadow-neon-teal">
              Create Free Account <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-500 flex items-center justify-center">
              <Zap className="w-3 h-3 text-dark-950" />
            </div>
            <span className="font-display font-bold text-sm text-white/60">SummarizeAI</span>
          </div>
          <p className="text-xs text-white/30">Final Year Project — Automatic Text Summarization System Using NLP</p>
          <div className="flex gap-4 text-xs text-white/30">
            <Link to="/login" className="hover:text-white transition-colors">Login</Link>
            <Link to="/register" className="hover:text-white transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
