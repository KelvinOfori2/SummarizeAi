import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Zap, User, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui'
import axios from 'axios'

const checks = [
  { label: '8+ characters', test: (v: string) => v.length >= 8 },
  { label: 'Uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Number', test: (v: string) => /[0-9]/.test(v) },
]

export default function Register() {
  const { register } = useAuth()
  const [form, setForm] = useState({ username: '', email: '', password: '', password_confirm: '', full_name: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.password_confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      await register(form)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail
        if (Array.isArray(detail)) {
          setError(detail.map((d: any) => d.msg).join(', '))
        } else {
          setError(detail || 'Registration failed')
        }
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="orb w-96 h-96 bg-purple-500 top-[-20%] left-[-10%]" style={{ opacity: 0.06 }} />
      <div className="orb w-72 h-72 bg-brand-500 bottom-[-10%] right-[-5%]" style={{ opacity: 0.05 }} />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 20 }}
        className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-neon-teal">
              <Zap className="w-5 h-5 text-dark-950" />
            </div>
            <span className="font-display font-bold text-xl text-white">SummarizeAI</span>
          </Link>
          <h1 className="font-display font-bold text-2xl text-white mb-1">Create your account</h1>
          <p className="text-white/40 text-sm">Start summarizing documents for free</p>
        </div>

        <div className="glass rounded-3xl p-8 border border-white/[0.06]">
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name (optional)</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input type="text" value={form.full_name} onChange={set('full_name')}
                  placeholder="Jane Doe" className="input-field pl-10" />
              </div>
            </div>

            <div>
              <label className="label">Username</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
                <input type="text" required value={form.username} onChange={set('username')}
                  placeholder="janedoe" className="input-field pl-8" />
              </div>
            </div>

            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input type="email" required value={form.email} onChange={set('email')}
                  placeholder="you@example.com" className="input-field pl-10" />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input type={showPass ? 'text' : 'password'} required value={form.password} onChange={set('password')}
                  placeholder="••••••••" className="input-field pl-10 pr-10" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password && (
                <div className="flex gap-3 mt-2 flex-wrap">
                  {checks.map(c => (
                    <div key={c.label} className={`flex items-center gap-1 text-xs ${c.test(form.password) ? 'text-brand-400' : 'text-white/30'}`}>
                      <CheckCircle2 className="w-3 h-3" />
                      {c.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input type="password" required value={form.password_confirm} onChange={set('password_confirm')}
                  placeholder="••••••••" className="input-field pl-10" />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-3.5 mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? <Spinner size="sm" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-sm text-white/40 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
