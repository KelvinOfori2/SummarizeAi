import apiClient from './client'

export interface SummarizeTextPayload {
  text: string
  algorithm: string
  summary_ratio: number
  title?: string
}

export const summariesApi = {
  create: (data: SummarizeTextPayload) => apiClient.post('/summaries/', data),
  uploadFile: (file: File, algorithm: string, summary_ratio: number, title?: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('algorithm', algorithm)
    form.append('summary_ratio', String(summary_ratio))
    if (title) form.append('title', title)
    return apiClient.post('/summaries/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  list: (page = 1, page_size = 10, search?: string) =>
    apiClient.get('/summaries/', { params: { page, page_size, search } }),
  get: (id: string) => apiClient.get(`/summaries/${id}`),
  delete: (id: string) => apiClient.delete(`/summaries/${id}`),
  export: (id: string, format: 'txt' | 'pdf' | 'docx') =>
    apiClient.get(`/summaries/${id}/export`, { params: { format }, responseType: 'blob' }),
}
