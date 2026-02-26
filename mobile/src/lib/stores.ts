import { create } from 'zustand'
import type { User, Couple, CoupleSettings } from './types'
import { authApi, coupleApi, getToken, clearToken, type ApiCouple, type ApiMember } from './api'

function apiUserToUser(api: { id: number; email: string; displayName: string }): User {
  return {
    id: api.id,
    name: api.displayName,
    email: api.email,
  }
}

function apiCoupleToCouple(api: ApiCouple): Couple {
  return {
    id: api.id,
    mode: api.mode,
    members: api.members.map((m: ApiMember) => ({
      userId: m.userId,
      displayName: m.displayName,
      incomeCents: m.incomeCents,
      percentage: m.percentage,
    })),
  }
}

// Auth Store
interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    await authApi.login(email, password)
    const apiUser = await authApi.me()
    set({ user: apiUserToUser(apiUser), isAuthenticated: true })
  },

  register: async (email, password, displayName) => {
    const response = await authApi.register(email, password, displayName)
    set({
      user: apiUserToUser({
        id: response.id,
        email: response.email,
        displayName: response.displayName,
      }),
      isAuthenticated: true,
    })
  },

  logout: async () => {
    await clearToken()
    set({ user: null, isAuthenticated: false })
    useCoupleStore.getState().reset()
  },

  checkAuth: async () => {
    set({ isLoading: true })
    try {
      const token = await getToken()
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false })
        return
      }
      const apiUser = await authApi.getCurrentUser()
      if (apiUser) {
        set({ user: apiUserToUser(apiUser), isAuthenticated: true, isLoading: false })
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false })
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },
}))

// Couple Store
interface CoupleState {
  couple: Couple | null
  inviteToken: string | null
  isLoading: boolean
  fetchCouple: () => Promise<void>
  createCouple: () => Promise<void>
  invitePartner: (email: string) => Promise<void>
  joinCouple: (token: string) => Promise<void>
  updateSettings: (settings: CoupleSettings) => Promise<void>
  reset: () => void
}

export const useCoupleStore = create<CoupleState>((set, get) => ({
  couple: null,
  inviteToken: null,
  isLoading: false,

  fetchCouple: async () => {
    set({ isLoading: true })
    try {
      const response = await coupleApi.getCouple()
      if (response.couple) {
        set({ couple: apiCoupleToCouple(response.couple), isLoading: false })
      } else {
        set({ couple: null, isLoading: false })
      }
    } catch {
      set({ couple: null, isLoading: false })
    }
  },

  createCouple: async () => {
    const response = await coupleApi.create()
    set({ couple: apiCoupleToCouple(response) })
  },

  invitePartner: async (email) => {
    const response = await coupleApi.invite(email)
    set({ inviteToken: response.token })
  },

  joinCouple: async (token) => {
    const response = await coupleApi.join(token)
    set({ couple: apiCoupleToCouple(response), inviteToken: null })
  },

  updateSettings: async (settings) => {
    const { couple } = get()
    if (!couple) return

    const members = couple.members.map((m, index) => ({
      userId: m.userId,
      incomeCents:
        settings.mode === 'income'
          ? index === 0
            ? (settings.incomeA || 0) * 100
            : (settings.incomeB || 0) * 100
          : undefined,
      percentage:
        settings.mode === 'percentage'
          ? index === 0
            ? settings.percentageA
            : settings.percentageB
          : undefined,
    }))

    const response = await coupleApi.updateSettings(settings.mode, members)
    set({ couple: apiCoupleToCouple(response) })
  },

  reset: () => {
    set({ couple: null, inviteToken: null, isLoading: false })
  },
}))

// Toast Store
interface ToastState {
  message: string | null
  type: 'success' | 'error' | 'info'
  show: (message: string, type?: 'success' | 'error' | 'info') => void
  hide: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  type: 'info',
  show: (message, type = 'info') => {
    set({ message, type })
    setTimeout(() => set({ message: null }), 3000)
  },
  hide: () => set({ message: null }),
}))