import apiClient from './client'

export const adminApi = {
  // Users
  listUsers: (page = 1, page_size = 20, search?: string) =>
    apiClient.get('/admin/users', { params: { page, page_size, search } }),
  createUser: (data: object) => apiClient.post('/admin/users', data),
  updateUser: (id: string, data: object) => apiClient.put(`/admin/users/${id}`, data),
  deleteUser: (id: string) => apiClient.delete(`/admin/users/${id}`),
  toggleBan: (id: string) => apiClient.post(`/admin/users/${id}/ban`),
  // Summaries
  listSummaries: (page = 1, page_size = 20, search?: string) =>
    apiClient.get('/admin/summaries', { params: { page, page_size, search } }),
  deleteSummary: (id: string) => apiClient.delete(`/admin/summaries/${id}`),
  // Analytics
  getAnalytics: () => apiClient.get('/admin/analytics'),
  // Logs
  getLogs: (page = 1, page_size = 30) =>
    apiClient.get('/admin/logs', { params: { page, page_size } }),
  // Settings
  getSettings: () => apiClient.get('/admin/settings'),
  updateSetting: (key: string, value: string) =>
    apiClient.put(`/admin/settings/${key}`, { value }),
}
