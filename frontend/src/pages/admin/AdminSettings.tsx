import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { adminApi } from '@/api/admin'
import { Spinner } from '@/components/ui'
import toast from 'react-hot-toast'
import { Settings, Save, Edit2, X, Check } from 'lucide-react'

export default function AdminSettings() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminApi.getSettings().then(r => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => adminApi.updateSetting(key, value),
    onSuccess: () => {
      toast.success('Setting updated')
      setEditing(null)
      qc.invalidateQueries({ queryKey: ['admin-settings'] })
    },
    onError: () => toast.error('Update failed'),
  })

  const grouped = settings?.reduce((acc: any, s: any) => {
    if (!acc[s.category]) acc[s.category] = []
    acc[s.category].push(s)
    return acc
  }, {} as Record<string, any[]>)

  const startEdit = (key: string, value: string) => {
    setEditing(key)
    setEditValue(value || '')
  }

  const cancelEdit = () => setEditing(null)

  const saveEdit = (key: string) => {
    updateMutation.mutate({ key, value: editValue })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-mono text-purple-400 uppercase tracking-widest mb-1">Admin</p>
        <h1 className="font-display font-bold text-3xl text-white">Application Settings</h1>
        <p className="text-white/40 mt-1">Configure platform-wide settings stored in the database.</p>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped || {}).map(([category, items]: [string, any]) => (
            <div key={category} className="glass rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-2">
                <Settings className="w-4 h-4 text-brand-400" />
                <h3 className="font-display font-semibold text-white capitalize">{category}</h3>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {items.map((s: any) => (
                  <div key={s.key} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-white/80">{s.key}</p>
                      <p className="text-xs text-white/30 mt-0.5">Last updated: {s.updated_at ? new Date(s.updated_at).toLocaleString() : 'never'}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-1 max-w-sm justify-end">
                      {editing === s.key ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(s.key); if (e.key === 'Escape') cancelEdit() }}
                            className="input-field py-1.5 text-sm flex-1"
                            autoFocus
                          />
                          <button onClick={() => saveEdit(s.key)} disabled={updateMutation.isPending}
                            className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors">
                            {updateMutation.isPending ? <Spinner size="sm" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button onClick={cancelEdit}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-mono text-brand-400 truncate max-w-[160px]">
                            {s.value ?? <span className="text-white/30 italic">null</span>}
                          </span>
                          <button onClick={() => startEdit(s.key, s.value || '')}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors shrink-0">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
