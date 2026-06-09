import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Zap, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import { authApi } from '@/api/auth'
import { Spinner } from '@/components/ui'
import axios from 'axios'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch (err) {
      if (axios.isAxiosError(err)) setError(err.response?.data?.detail || 'Request failed')
      else setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="orb w-96 h-96 bg-brand-500 top-[-20%] right-[-10%]" style={{ opacity: 0.06 }} />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20 }} className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-neon-teal">
              <Zap className="w-5 h-5 text-dark-950" />
            </div>
            <span className="font-display font-bold text-xl text-white">SummarizeAI</span>
          </Link>
          <h1 className="font-display font-bold text-2xl text-white mb-1">Reset your password</h1>
          <p className="text-white/40 text-sm">Enter your email and we'll send a reset link</p>
        </div>

        <div className="glass rounded-3xl p-8 border border-white/[0.06]">
          {sent ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-brand-400 mx-auto mb-4" />
              <h3 className="font-display font-semibold text-white mb-2">Check your email</h3>
              <p className="text-sm text-white/50">
                If <span className="text-white">{email}</span> is registered, a password reset link has been sent.
              </p>
            </motion.div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com" className="input-field pl-10" />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="btn-primary w-full justify-center py-3.5 disabled:opacity-60">
                  {loading ? <Spinner size="sm" /> : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}

          <div className="flex justify-center mt-6">
            <Link to="/login" className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
