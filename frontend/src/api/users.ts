import apiClient from './client'

export const usersApi = {
  getMe: () => apiClient.get('/users/me'),
  updateMe: (data: { full_name?: string; username?: string }) => apiClient.put('/users/me', data),
  changePassword: (data: { current_password: string; new_password: string; new_password_confirm: string }) =>
    apiClient.put('/users/me/password', data),
  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient.post('/users/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  getStats: () => apiClient.get('/users/me/stats'),
  getActivity: () => apiClient.get('/users/me/activity'),
}
