import { create } from 'zustand'
import { apiClient } from './api'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'super_admin' | 'owner' | 'manager' | 'admin' | 'teacher' | 'corporate_client' | 'student'
  organization_id: string
  organization_name: string
  organization_slug: string
  brand_name: string
  is_active: boolean
}

interface AuthStore {
  user: User | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  me: () => Promise<void>
  hasRole: (roles: string | string[]) => boolean
}

export const useAuth = create<AuthStore>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.login(email, password)
      localStorage.setItem('access_token', response.access)
      localStorage.setItem('refresh_token', response.refresh)
      localStorage.setItem('user_role', response.user.role)
      set({ user: response.user, isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Login failed',
        isLoading: false,
      })
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_role')
    set({ user: null, error: null })
  },

  me: async () => {
    set({ isLoading: true })
    try {
      const user = await apiClient.getMe()
      localStorage.setItem('user_role', user.role)
      set({ user, isLoading: false })
    } catch (error: any) {
      set({ error: 'Failed to fetch user', isLoading: false })
      throw error
    }
  },

  hasRole: (roles: string | string[]) => {
    const user = get().user
    if (!user) return false
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(user.role)
  },
}))
