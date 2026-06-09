import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/api/users'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui'
import { timeAgo } from '@/utils/helpers'
import toast from 'react-hot-toast'
import axios from 'axios'
import {
  User, Mail, Lock, Camera, Save, Eye, EyeOff, Activity, Clock,
} from 'lucide-react'

export default function Profile() {
  const { user, setUser } = useAuthStore()
  const qc = useQueryClient()
  const avatarRef = useRef<HTMLInputElement>(null)

  const [profileForm, setProfileForm] = useState({ username: user?.username || '', full_name: user?.full_name || '' })
  const [passForm, setPassForm] = useState({ current_password: '', new_password: '', new_password_confirm: '' })
  const [showPass, setShowPass] = useState({ current: false, new: false })

  const { data: activity } = useQuery({
    queryKey: ['activity'],
    queryFn: () => usersApi.getActivity().then(r => r.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => usersApi.getStats().then(r => r.data),
  })

  const profileMutation = useMutation({
    mutationFn: () => usersApi.updateMe(profileForm),
    onSuccess: (res) => { setUser(res.data); toast.success('Profile updated') },
    onError: (err) => {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.detail || 'Update failed')
    },
  })

  const passMutation = useMutation({
    mutationFn: () => usersApi.changePassword(passForm),
    onSuccess: () => { setPassForm({ current_password: '', new_password: '', new_password_confirm: '' }); toast.success('Password changed') },
    onError: (err) => {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.detail || 'Failed to change password')
    },
  })

  const avatarMutation = useMutation({
    mutationFn: (file: File) => usersApi.uploadAvatar(file),
    onSuccess: (res) => {
      setUser({ ...user!, avatar_url: res.data.avatar_url })
      toast.success('Avatar updated')
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.detail || 'Upload failed')
    },
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) avatarMutation.mutate(file)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-mono text-brand-400 uppercase tracking-widest mb-1">Account</p>
        <h1 className="font-display font-bold text-3xl text-white">Profile Settings</h1>
        <p className="text-white/40 mt-1">Manage your account information and security.</p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left — Avatar + stats */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6 flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-2xl bg-brand-500/20 border-2 border-brand-500/30 overflow-hidden flex items-center justify-center">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display font-bold text-3xl text-brand-400">
                    {user?.username?.[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <button onClick={() => avatarRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-neon-teal hover:bg-brand-400 transition-colors">
                {avatarMutation.isPending ? <Spinner size="sm" /> : <Camera className="w-3.5 h-3.5 text-dark-950" />}
              </button>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <h3 className="font-display font-bold text-white">{user?.username}</h3>
            <p className="text-sm text-white/40">{user?.email}</p>
            <span className={`badge mt-2 ${user?.role === 'admin' ? 'badge-purple' : 'badge-teal'}`}>
              {user?.role}
            </span>
          </div>

          {/* Mini stats */}
          <div className="glass rounded-2xl p-5 space-y-3">
            <h3 className="font-display font-semibold text-sm text-white/60 uppercase tracking-wider">Stats</h3>
            {[
              { label: 'Total Summaries', value: stats?.total_summaries ?? '—' },
              { label: 'Words Processed', value: stats?.total_words_processed?.toLocaleString() ?? '—' },
              { label: 'Words Saved', value: stats?.total_words_saved?.toLocaleString() ?? '—' },
            ].map(s => (
              <div key={s.label} className="flex justify-between items-center py-1.5 border-b border-white/[0.04] last:border-0">
                <span className="text-xs text-white/40">{s.label}</span>
                <span className="text-sm font-mono font-semibold text-white">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Forms */}
        <div className="lg:col-span-2 space-y-5">
          {/* Edit Profile */}
          <div className="glass rounded-2xl p-6">
            <h2 className="font-display font-bold text-lg text-white mb-5 flex items-center gap-2">
              <User className="w-5 h-5 text-brand-400" /> Profile Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input type="text" value={profileForm.full_name}
                  onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Jane Doe" className="input-field" />
              </div>
              <div>
                <label className="label">Username</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
                  <input type="text" value={profileForm.username}
                    onChange={e => setProfileForm(f => ({ ...f, username: e.target.value }))}
                    className="input-field pl-8" />
                </div>
              </div>
              <div>
                <label className="label">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input type="email" value={user?.email || ''} disabled
                    className="input-field pl-10 opacity-50 cursor-not-allowed" />
                </div>
                <p className="text-xs text-white/30 mt-1">Email cannot be changed.</p>
              </div>
              <button onClick={() => profileMutation.mutate()} disabled={profileMutation.isPending}
                className="btn-primary text-sm px-5 py-2.5 disabled:opacity-60">
                {profileMutation.isPending ? <Spinner size="sm" /> : <><Save className="w-4 h-4" />Save Changes</>}
              </button>
            </div>
          </div>

          {/* Change Password */}
          <div className="glass rounded-2xl p-6">
            <h2 className="font-display font-bold text-lg text-white mb-5 flex items-center gap-2">
              <Lock className="w-5 h-5 text-brand-400" /> Change Password
            </h2>
            <div className="space-y-4">
              {[
                { key: 'current_password' as const, label: 'Current Password', showKey: 'current' as const },
                { key: 'new_password' as const, label: 'New Password', showKey: 'new' as const },
                { key: 'new_password_confirm' as const, label: 'Confirm New Password', showKey: 'new' as const },
              ].map(({ key, label, showKey }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input type={showPass[showKey] ? 'text' : 'password'}
                      value={passForm[key]}
                      onChange={e => setPassForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder="••••••••" className="input-field pl-10 pr-10" />
                    <button type="button"
                      onClick={() => setShowPass(s => ({ ...s, [showKey]: !s[showKey] }))}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showPass[showKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => passMutation.mutate()} disabled={passMutation.isPending}
                className="btn-primary text-sm px-5 py-2.5 disabled:opacity-60">
                {passMutation.isPending ? <Spinner size="sm" /> : <><Lock className="w-4 h-4" />Update Password</>}
              </button>
            </div>
          </div>

          {/* Activity Log */}
          <div className="glass rounded-2xl p-6">
            <h2 className="font-display font-bold text-lg text-white mb-5 flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-400" /> Recent Activity
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
              {activity?.map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/70 capitalize">{log.action.replace(/_/g, ' ')}</p>
                    {log.description && <p className="text-xs text-white/30 truncate">{log.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white/30 shrink-0">
                    <Clock className="w-3 h-3" />
                    {timeAgo(log.created_at)}
                  </div>
                </div>
              ))}
              {(!activity || activity.length === 0) && (
                <p className="text-sm text-white/30 text-center py-6">No activity recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
