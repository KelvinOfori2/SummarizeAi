import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { adminApi } from '@/api/admin'
import { Spinner, Modal, EmptyState } from '@/components/ui'
import { formatDateTime } from '@/utils/helpers'
import toast from 'react-hot-toast'
import axios from 'axios'
import { Search, UserPlus, Trash2, Ban, CheckCircle, Edit2, X, Users } from 'lucide-react'

export default function UserManagement() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ username: '', email: '', password: '', full_name: '', role: 'user' })
  const [editForm, setEditForm] = useState<any>({})

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () => adminApi.listUsers(page, 20, search || undefined).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => adminApi.createUser(createForm),
    onSuccess: () => { toast.success('User created'); setShowCreate(false); setCreateForm({ username: '', email: '', password: '', full_name: '', role: 'user' }); qc.invalidateQueries({ queryKey: ['admin-users'] }) },
    onError: (err) => { if (axios.isAxiosError(err)) toast.error(err.response?.data?.detail || 'Create failed') },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.updateUser(id, data),
    onSuccess: () => { toast.success('User updated'); setEditTarget(null); qc.invalidateQueries({ queryKey: ['admin-users'] }) },
    onError: (err) => { if (axios.isAxiosError(err)) toast.error(err.response?.data?.detail || 'Update failed') },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => { toast.success('User deleted'); setDeleteTarget(null); qc.invalidateQueries({ queryKey: ['admin-users'] }) },
    onError: (err) => { if (axios.isAxiosError(err)) toast.error(err.response?.data?.detail || 'Delete failed') },
  })

  const banMutation = useMutation({
    mutationFn: (id: string) => adminApi.toggleBan(id),
    onSuccess: (res) => { toast.success(res.data.message); qc.invalidateQueries({ queryKey: ['admin-users'] }) },
    onError: () => toast.error('Action failed'),
  })

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setSearch(searchInput); setPage(1) }
  const openEdit = (user: any) => { setEditTarget(user); setEditForm({ full_name: user.full_name || '', role: user.role, is_active: user.is_active, is_banned: user.is_banned }) }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-mono text-purple-400 uppercase tracking-widest mb-1">Admin</p>
        <h1 className="font-display font-bold text-3xl text-white">User Management</h1>
        <p className="text-white/40 mt-1">View, create, edit, and moderate user accounts.</p>
      </motion.div>

      <div className="flex gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-48">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Search users..." className="input-field pl-10" />
          </div>
          <button type="submit" className="btn-primary px-4 py-2.5 text-sm">Search</button>
        </form>
        <button onClick={() => setShowCreate(true)} className="btn-primary px-4 py-2.5 text-sm">
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : !users || users.length === 0 ? (
        <EmptyState icon={<Users className="w-7 h-7" />} title="No users found" />
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['User', 'Role', 'Status', 'Joined', 'Last Login', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-mono text-white/40 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-xs">
                          {u.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white">{u.username}</p>
                          <p className="text-xs text-white/40">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-teal'}`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      {u.is_banned ? (
                        <span className="badge badge-red">Banned</span>
                      ) : u.is_active ? (
                        <span className="badge badge-green">Active</span>
                      ) : (
                        <span className="badge">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40 font-mono">{formatDateTime(u.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-white/40 font-mono">{u.last_login ? formatDateTime(u.last_login) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(u)} title="Edit"
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => banMutation.mutate(u.id)} title={u.is_banned ? 'Unban' : 'Ban'}
                          className={`p-1.5 rounded-lg transition-colors ${u.is_banned ? 'hover:bg-green-500/10 text-green-400' : 'hover:bg-amber-500/10 text-amber-400 hover:text-amber-300'}`}>
                          {u.is_banned ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => setDeleteTarget(u.id)} title="Delete"
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New User">
        <div className="space-y-3">
          {[
            { k: 'full_name', label: 'Full Name', type: 'text', placeholder: 'Jane Doe' },
            { k: 'username', label: 'Username', type: 'text', placeholder: 'janedoe' },
            { k: 'email', label: 'Email', type: 'email', placeholder: 'jane@example.com' },
            { k: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
          ].map(({ k, label, type, placeholder }) => (
            <div key={k}>
              <label className="label">{label}</label>
              <input type={type} value={createForm[k as keyof typeof createForm]}
                onChange={e => setCreateForm(f => ({ ...f, [k]: e.target.value }))}
                placeholder={placeholder} className="input-field" />
            </div>
          ))}
          <div>
            <label className="label">Role</label>
            <select value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}
              className="input-field">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1 justify-center py-2.5 text-sm">Cancel</button>
            <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}
              className="btn-primary flex-1 justify-center py-2.5 text-sm disabled:opacity-60">
              {createMutation.isPending ? <Spinner size="sm" /> : 'Create User'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit: @${editTarget?.username}`}>
        <div className="space-y-3">
          <div>
            <label className="label">Full Name</label>
            <input type="text" value={editForm.full_name || ''}
              onChange={e => setEditForm((f: any) => ({ ...f, full_name: e.target.value }))}
              className="input-field" />
          </div>
          <div>
            <label className="label">Role</label>
            <select value={editForm.role} onChange={e => setEditForm((f: any) => ({ ...f, role: e.target.value }))}
              className="input-field">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editForm.is_active}
                onChange={e => setEditForm((f: any) => ({ ...f, is_active: e.target.checked }))}
                className="accent-brand-500" />
              <span className="text-sm text-white/70">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editForm.is_banned}
                onChange={e => setEditForm((f: any) => ({ ...f, is_banned: e.target.checked }))}
                className="accent-red-500" />
              <span className="text-sm text-white/70">Banned</span>
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setEditTarget(null)} className="btn-ghost flex-1 justify-center py-2.5 text-sm">Cancel</button>
            <button onClick={() => editTarget && updateMutation.mutate({ id: editTarget.id, data: editForm })}
              disabled={updateMutation.isPending}
              className="btn-primary flex-1 justify-center py-2.5 text-sm disabled:opacity-60">
              {updateMutation.isPending ? <Spinner size="sm" /> : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete User" danger>
        <p className="text-sm text-white/60 mb-6">This will permanently delete the user and all their data.</p>
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
