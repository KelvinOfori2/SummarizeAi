import apiClient from './client'

export interface RegisterPayload {
  username: string
  email: string
  password: string
  password_confirm: string
  full_name?: string
}

export interface LoginPayload {
  email: string
  password: string
  remember_me?: boolean
}

export const authApi = {
  register: (data: RegisterPayload) => apiClient.post('/auth/register', data),
  login: (data: LoginPayload) => apiClient.post('/auth/login', data),
  refresh: (refresh_token: string) => apiClient.post('/auth/refresh', { refresh_token }),
  forgotPassword: (email: string) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, new_password: string, new_password_confirm: string) =>
    apiClient.post('/auth/reset-password', { token, new_password, new_password_confirm }),
}
