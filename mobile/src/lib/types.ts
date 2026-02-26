export interface User {
  id: number
  name: string
  email: string
}

export interface CoupleSettings {
  mode: 'income' | 'percentage' | 'equal'
  incomeA?: number
  incomeB?: number
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
  inviteToken?: string
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

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  groceries: 'Courses',
  leisure: 'Loisirs',
  transport: 'Transport',
  housing: 'Logement',
  health: 'Santé',
  other: 'Autre',
}

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  groceries: '🛒',
  leisure: '🎮',
  transport: '🚗',
  housing: '🏠',
  health: '💊',
  other: '📦',
}