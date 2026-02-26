const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

// Token storage
const TOKEN_KEY = 'prorata_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

// API error handling
export class ApiError extends Error {
  status: number
  errors?: Record<string, string>

  constructor(status: number, message: string, errors?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

// Base fetch function
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new ApiError(
      response.status,
      data.message || 'Une erreur est survenue',
      data.errors
    )
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

// API Types matching backend DTOs
export interface ApiUser {
  id: number
  email: string
  displayName: string
}

export interface ApiAuthResponse {
  id: number
  email: string
  displayName: string
  token: string
}

export interface ApiTokenResponse {
  token: string
}

export interface ApiMember {
  userId: number
  displayName: string
  incomeCents: number | null
  percentage: number | null
}

export interface ApiCouple {
  id: number
  mode: 'income' | 'percentage' | 'equal'
  members: ApiMember[]
}

export interface ApiCoupleWrapper {
  couple: ApiCouple | null
}

export interface ApiInvite {
  token: string
  invitedEmail: string
  createdAt: string
}

export interface ApiPaidBy {
  userId: number
  displayName: string
}

export interface ApiExpense {
  id: number
  title: string
  category: string
  amountCents: number
  currency: string
  spentAt: string
  paidBy: ApiPaidBy
}

export interface ApiExpenseList {
  items: ApiExpense[]
  isClosed: boolean
}

export interface ApiSettlement {
  fromUserId: number
  toUserId: number
  amountCents: number
}

export interface ApiMemberBalance {
  userId: number
  displayName: string
  weight: number
  targetCents: number
  paidCents: number
  deltaCents: number
}

export interface ApiBalance {
  year: number
  month: number
  totalCents: number
  currency: string
  mode: string
  members: ApiMemberBalance[]
  settlement: ApiSettlement | null
  isClosed: boolean
}

export interface ApiHistoryItem {
  year: number
  month: number
  closedAt: string
  totalCents: number
  settlement: ApiSettlement | null
}

export interface ApiHistoryList {
  items: ApiHistoryItem[]
}

// Auth API
export const authApi = {
  async register(email: string, password: string, displayName: string): Promise<ApiAuthResponse> {
    const response = await apiFetch<ApiAuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    })
    setToken(response.token)
    return response
  },

  async login(email: string, password: string): Promise<ApiTokenResponse> {
    const response = await apiFetch<ApiTokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setToken(response.token)
    return response
  },

  async logout(): Promise<void> {
    clearToken()
  },

  async me(): Promise<ApiUser> {
    return apiFetch<ApiUser>('/me')
  },

  async getCurrentUser(): Promise<ApiUser | null> {
    const token = getToken()
    if (!token) return null
    try {
      return await apiFetch<ApiUser>('/me')
    } catch {
      clearToken()
      return null
    }
  },
}

// Couple API
export const coupleApi = {
  async getCouple(): Promise<ApiCoupleWrapper> {
    return apiFetch<ApiCoupleWrapper>('/couple/me')
  },

  async create(): Promise<ApiCouple> {
    return apiFetch<ApiCouple>('/couple/create', { method: 'POST' })
  },

  async invite(email: string): Promise<ApiInvite> {
    return apiFetch<ApiInvite>('/couple/invite', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  async join(token: string): Promise<ApiCouple> {
    return apiFetch<ApiCouple>('/couple/join', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  },

  async updateSettings(
    mode: string,
    members: { userId: number; incomeCents?: number; percentage?: number }[]
  ): Promise<ApiCouple> {
    return apiFetch<ApiCouple>('/couple/settings', {
      method: 'PUT',
      body: JSON.stringify({ mode, members }),
    })
  },
}

// Expenses API
export const expensesApi = {
  async list(year: number, month: number): Promise<ApiExpenseList> {
    return apiFetch<ApiExpenseList>(`/expenses?year=${year}&month=${month}`)
  },

  async create(data: {
    title: string
    category: string
    amountCents: number
    currency: string
    spentAt: string
    paidByUserId: number
  }): Promise<ApiExpense> {
    return apiFetch<ApiExpense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async update(
    id: number,
    data: {
      title?: string
      category?: string
      amountCents?: number
      currency?: string
      spentAt?: string
      paidByUserId?: number
    }
  ): Promise<ApiExpense> {
    return apiFetch<ApiExpense>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async delete(id: number): Promise<void> {
    return apiFetch<void>(`/expenses/${id}`, { method: 'DELETE' })
  },

  async getById(_id: number): Promise<ApiExpense> {
    // We fetch the month's expenses and find the one we need
    // This is a workaround since backend doesn't have a single expense endpoint
    throw new Error('Use list and filter instead')
  },
}

// Months API
export const monthsApi = {
  async balance(year: number, month: number): Promise<ApiBalance> {
    return apiFetch<ApiBalance>(`/months/balance?year=${year}&month=${month}`)
  },

  async close(year: number, month: number): Promise<ApiBalance> {
    return apiFetch<ApiBalance>('/months/close', {
      method: 'POST',
      body: JSON.stringify({ year, month }),
    })
  },

  async history(): Promise<ApiHistoryList> {
    return apiFetch<ApiHistoryList>('/months/history')
  },

  async detail(year: number, month: number): Promise<ApiBalance> {
    return apiFetch<ApiBalance>(`/months/${year}/${month}`)
  },
}