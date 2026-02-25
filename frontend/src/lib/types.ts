// Frontend types - used throughout the app
export interface User {
  id: number
  name: string
  email: string
}

export interface CoupleSettings {
  mode: 'income' | 'percentage' | 'equal'
  // For income mode: user incomes in euros (not cents for frontend display)
  incomeA?: number
  incomeB?: number
  // For percentage mode
  percentageA?: number
  percentageB?: number
}

export interface CoupleMember {
  userId: number
  displayName: string
  incomeCents: number | null
  percentage: number | null
}

export interface Couple {
  id: number
  mode: 'income' | 'percentage' | 'equal'
  members: CoupleMember[]
  inviteToken?: string // Only available after creating invite
}

export interface Expense {
  id: number
  title: string
  category: ExpenseCategory
  amountCents: number
  spentAt: string
  paidByUserId: number
  paidByName: string
}

export type ExpenseCategory =
  | 'groceries'
  | 'leisure'
  | 'transport'
  | 'housing'
  | 'health'
  | 'other'

export interface Settlement {
  fromUserId: number
  toUserId: number
  amount: number
}

export interface MemberBalance {
  userId: number
  displayName: string
  weight: number
  targetCents: number
  paidCents: number
  deltaCents: number
}

export interface BalanceBreakdown {
  year: number
  month: number
  totalCents: number
  currency: string
  mode: string
  members: MemberBalance[]
  settlement: Settlement | null
  isClosed: boolean
}

export interface MonthClosure {
  year: number
  month: number
  closedAt: string
  totalCents: number
  settlement: Settlement | null
}

// Legacy types for balance.ts compatibility
export interface BalanceSnapshot {
  total: number
  weightA: number
  weightB: number
  targetA: number
  targetB: number
  paidA: number
  paidB: number
  deltaA: number
  settlement: Settlement | null
}