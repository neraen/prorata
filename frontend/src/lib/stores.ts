import { create } from 'zustand'
import type { User, Couple, CoupleMember, CoupleSettings } from './types'
import { authApi, coupleApi, getToken, clearToken, type ApiCouple, type ApiMember } from './api'

// Convert API types to frontend types
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

function getPartnerFromCouple(couple: Couple, currentUserId: number): User | null {
  const partnerMember = couple.members.find(m => m.userId !== currentUserId)
  if (!partnerMember) return null
  return {
    id: partnerMember.userId,
    name: partnerMember.displayName,
    email: '', // Not available from couple endpoint
  }
}

interface AuthState {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  login: async (email, password) => {
    await authApi.login(email, password)
    const apiUser = await authApi.me()
    set({ user: apiUserToUser(apiUser) })
  },

  register: async (email, password, name) => {
    const response = await authApi.register(email, password, name)
    set({
      user: {
        id: response.id,
        name: response.displayName,
        email: response.email,
      },
    })
  },

  logout: async () => {
    await authApi.logout()
    set({ user: null })
  },

  checkAuth: async () => {
    set({ isLoading: true })
    try {
      const token = getToken()
      if (!token) {
        set({ user: null, isLoading: false })
        return
      }
      const apiUser = await authApi.getCurrentUser()
      if (apiUser) {
        set({ user: apiUserToUser(apiUser), isLoading: false })
      } else {
        set({ user: null, isLoading: false })
      }
    } catch {
      clearToken()
      set({ user: null, isLoading: false })
    }
  },
}))

interface CoupleState {
  couple: Couple | null
  partner: User | null
  inviteToken: string | null
  isLoading: boolean
  fetchCouple: () => Promise<void>
  createCouple: () => Promise<void>
  invitePartner: (email: string) => Promise<string>
  joinCouple: (token: string) => Promise<void>
  updateSettings: (settings: CoupleSettings) => Promise<void>
}

export const useCoupleStore = create<CoupleState>((set, get) => ({
  couple: null,
  partner: null,
  inviteToken: null,
  isLoading: true,

  fetchCouple: async () => {
    set({ isLoading: true })
    try {
      const response = await coupleApi.getCouple()
      if (response.couple) {
        const couple = apiCoupleToCouple(response.couple)
        const currentUser = useAuthStore.getState().user
        const partner = currentUser ? getPartnerFromCouple(couple, currentUser.id) : null
        set({ couple, partner, isLoading: false })
      } else {
        set({ couple: null, partner: null, isLoading: false })
      }
    } catch {
      set({ couple: null, partner: null, isLoading: false })
    }
  },

  createCouple: async () => {
    const apiCouple = await coupleApi.create()
    const couple = apiCoupleToCouple(apiCouple)
    set({ couple, partner: null })
  },

  invitePartner: async (email: string) => {
    const response = await coupleApi.invite(email)
    set({ inviteToken: response.token })
    return response.token
  },

  joinCouple: async (token: string) => {
    const apiCouple = await coupleApi.join(token)
    const couple = apiCoupleToCouple(apiCouple)
    const currentUser = useAuthStore.getState().user
    const partner = currentUser ? getPartnerFromCouple(couple, currentUser.id) : null
    set({ couple, partner })
  },

  updateSettings: async (settings: CoupleSettings) => {
    const { couple } = get()
    if (!couple) return

    const currentUser = useAuthStore.getState().user
    if (!currentUser) return

    // Build members array for API
    const members: { userId: number; incomeCents?: number; percentage?: number }[] = []

    if (settings.mode === 'income') {
      // Find which member is the current user (A) and which is partner (B)
      const memberA = couple.members.find(m => m.userId === currentUser.id)
      const memberB = couple.members.find(m => m.userId !== currentUser.id)

      if (memberA) {
        members.push({
          userId: memberA.userId,
          incomeCents: Math.round((settings.incomeA || 0) * 100),
        })
      }
      if (memberB) {
        members.push({
          userId: memberB.userId,
          incomeCents: Math.round((settings.incomeB || 0) * 100),
        })
      }
    } else if (settings.mode === 'percentage') {
      const memberA = couple.members.find(m => m.userId === currentUser.id)
      const memberB = couple.members.find(m => m.userId !== currentUser.id)

      if (memberA) {
        members.push({
          userId: memberA.userId,
          percentage: settings.percentageA || 50,
        })
      }
      if (memberB) {
        members.push({
          userId: memberB.userId,
          percentage: settings.percentageB || (100 - (settings.percentageA || 50)),
        })
      }
    }

    const apiCouple = await coupleApi.updateSettings(settings.mode, members)
    const updatedCouple = apiCoupleToCouple(apiCouple)
    set({ couple: updatedCouple })
  },
}))

interface MonthState {
  year: number
  month: number
  setMonth: (year: number, month: number) => void
}

export const useMonthStore = create<MonthState>((set) => {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    setMonth: (year, month) => set({ year, month }),
  }
})

interface ToastState {
  message: string | null
  type: 'success' | 'error' | null
  show: (message: string, type: 'success' | 'error') => void
  hide: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  type: null,
  show: (message, type) => {
    set({ message, type })
    setTimeout(() => set({ message: null, type: null }), 3000)
  },
  hide: () => set({ message: null, type: null }),
}))