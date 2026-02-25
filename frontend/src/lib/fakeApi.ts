import type { User, Couple, Expense, MonthClosure, CoupleSettings } from './types'
import { getItem, setItem, STORAGE_KEYS } from './storage'
import { generateId, generateInviteCode, getCurrentYearMonth } from './utils'
import dayjs from 'dayjs'

// Demo data initialization
function initDemoData() {
  const existingUsers = getItem<User[]>(STORAGE_KEYS.USERS)
  if (existingUsers && existingUsers.length > 0) return

  const clara: User = { id: 'user_clara', name: 'Clara', email: 'clara@demo.com' }
  const julien: User = { id: 'user_julien', name: 'Julien', email: 'julien@demo.com' }

  const couple: Couple = {
    id: 'couple_1',
    userIds: [clara.id, julien.id],
    inviteCode: 'DEMO42',
    settings: {
      mode: 'income',
      incomeA: 2400,
      incomeB: 1600,
    },
  }

  const { year, month } = getCurrentYearMonth()
  const expenses: Expense[] = [
    {
      id: generateId(),
      title: 'Courses Carrefour',
      category: 'groceries',
      amountCents: 15680,
      spentAt: dayjs().year(year).month(month - 1).date(3).toISOString(),
      paidByUserId: clara.id,
      coupleId: couple.id,
    },
    {
      id: generateId(),
      title: 'Restaurant italien',
      category: 'leisure',
      amountCents: 8500,
      spentAt: dayjs().year(year).month(month - 1).date(7).toISOString(),
      paidByUserId: julien.id,
      coupleId: couple.id,
    },
    {
      id: generateId(),
      title: 'Essence',
      category: 'transport',
      amountCents: 7200,
      spentAt: dayjs().year(year).month(month - 1).date(10).toISOString(),
      paidByUserId: clara.id,
      coupleId: couple.id,
    },
    {
      id: generateId(),
      title: 'Électricité',
      category: 'housing',
      amountCents: 12400,
      spentAt: dayjs().year(year).month(month - 1).date(12).toISOString(),
      paidByUserId: julien.id,
      coupleId: couple.id,
    },
    {
      id: generateId(),
      title: 'Pharmacie',
      category: 'health',
      amountCents: 2350,
      spentAt: dayjs().year(year).month(month - 1).date(15).toISOString(),
      paidByUserId: clara.id,
      coupleId: couple.id,
    },
    {
      id: generateId(),
      title: 'Courses Lidl',
      category: 'groceries',
      amountCents: 9800,
      spentAt: dayjs().year(year).month(month - 1).date(18).toISOString(),
      paidByUserId: julien.id,
      coupleId: couple.id,
    },
    {
      id: generateId(),
      title: 'Cinéma',
      category: 'leisure',
      amountCents: 2400,
      spentAt: dayjs().year(year).month(month - 1).date(20).toISOString(),
      paidByUserId: clara.id,
      coupleId: couple.id,
    },
  ]

  setItem(STORAGE_KEYS.USERS, [clara, julien])
  setItem(STORAGE_KEYS.COUPLES, [couple])
  setItem(STORAGE_KEYS.EXPENSES, expenses)
  setItem(STORAGE_KEYS.CLOSURES, [])
}

initDemoData()

// Auth API
export const authApi = {
  async login(email: string, _password: string): Promise<User> {
    await delay(300)
    const users = getItem<User[]>(STORAGE_KEYS.USERS) || []
    const user = users.find(u => u.email === email)
    if (!user) throw new Error('Identifiants invalides')
    setItem(STORAGE_KEYS.CURRENT_USER, user)
    return user
  },

  async register(email: string, _password: string, name: string): Promise<User> {
    await delay(300)
    const users = getItem<User[]>(STORAGE_KEYS.USERS) || []
    if (users.find(u => u.email === email)) {
      throw new Error('Cet email est déjà utilisé')
    }
    const user: User = { id: generateId(), name, email }
    users.push(user)
    setItem(STORAGE_KEYS.USERS, users)
    setItem(STORAGE_KEYS.CURRENT_USER, user)
    return user
  },

  async logout(): Promise<void> {
    await delay(100)
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
  },

  async getCurrentUser(): Promise<User | null> {
    await delay(100)
    return getItem<User>(STORAGE_KEYS.CURRENT_USER)
  },
}

// Couple API
export const coupleApi = {
  async getCoupleForUser(userId: string): Promise<Couple | null> {
    await delay(200)
    const couples = getItem<Couple[]>(STORAGE_KEYS.COUPLES) || []
    return couples.find(c => c.userIds.includes(userId)) || null
  },

  async createCouple(userId: string): Promise<Couple> {
    await delay(300)
    const couples = getItem<Couple[]>(STORAGE_KEYS.COUPLES) || []
    const couple: Couple = {
      id: generateId(),
      userIds: [userId, ''],
      inviteCode: generateInviteCode(),
      settings: { mode: 'equal' },
    }
    couples.push(couple)
    setItem(STORAGE_KEYS.COUPLES, couples)
    return couple
  },

  async joinCouple(userId: string, inviteCode: string): Promise<Couple> {
    await delay(300)
    const couples = getItem<Couple[]>(STORAGE_KEYS.COUPLES) || []
    const couple = couples.find(c => c.inviteCode === inviteCode)
    if (!couple) throw new Error('Code invalide')
    if (couple.userIds[1]) throw new Error('Ce couple est déjà complet')
    couple.userIds[1] = userId
    setItem(STORAGE_KEYS.COUPLES, couples)
    return couple
  },

  async updateSettings(coupleId: string, settings: CoupleSettings): Promise<Couple> {
    await delay(200)
    const couples = getItem<Couple[]>(STORAGE_KEYS.COUPLES) || []
    const couple = couples.find(c => c.id === coupleId)
    if (!couple) throw new Error('Couple non trouvé')
    couple.settings = settings
    setItem(STORAGE_KEYS.COUPLES, couples)
    return couple
  },

  async getPartner(couple: Couple, currentUserId: string): Promise<User | null> {
    const partnerId = couple.userIds.find(id => id !== currentUserId && id !== '')
    if (!partnerId) return null
    const users = getItem<User[]>(STORAGE_KEYS.USERS) || []
    return users.find(u => u.id === partnerId) || null
  },

  async getUserById(userId: string): Promise<User | null> {
    const users = getItem<User[]>(STORAGE_KEYS.USERS) || []
    return users.find(u => u.id === userId) || null
  },
}

// Expenses API
export const expensesApi = {
  async getExpenses(coupleId: string, year: number, month: number): Promise<Expense[]> {
    await delay(200)
    const expenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES) || []
    return expenses.filter(e => {
      if (e.coupleId !== coupleId) return false
      const date = dayjs(e.spentAt)
      return date.year() === year && date.month() + 1 === month
    }).sort((a, b) => dayjs(b.spentAt).valueOf() - dayjs(a.spentAt).valueOf())
  },

  async createExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
    await delay(200)
    const expenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES) || []
    const newExpense: Expense = { ...expense, id: generateId() }
    expenses.push(newExpense)
    setItem(STORAGE_KEYS.EXPENSES, expenses)
    return newExpense
  },

  async updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
    await delay(200)
    const expenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES) || []
    const index = expenses.findIndex(e => e.id === id)
    if (index === -1) throw new Error('Dépense non trouvée')
    expenses[index] = { ...expenses[index], ...data }
    setItem(STORAGE_KEYS.EXPENSES, expenses)
    return expenses[index]
  },

  async deleteExpense(id: string): Promise<void> {
    await delay(200)
    const expenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES) || []
    const filtered = expenses.filter(e => e.id !== id)
    setItem(STORAGE_KEYS.EXPENSES, filtered)
  },

  async getExpenseById(id: string): Promise<Expense | null> {
    await delay(100)
    const expenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES) || []
    return expenses.find(e => e.id === id) || null
  },
}

// Closures API
export const closuresApi = {
  async getClosures(coupleId: string): Promise<MonthClosure[]> {
    await delay(200)
    const closures = getItem<MonthClosure[]>(STORAGE_KEYS.CLOSURES) || []
    return closures
      .filter(c => c.coupleId === coupleId)
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year
        return b.month - a.month
      })
  },

  async getClosure(coupleId: string, year: number, month: number): Promise<MonthClosure | null> {
    await delay(100)
    const closures = getItem<MonthClosure[]>(STORAGE_KEYS.CLOSURES) || []
    return closures.find(c => c.coupleId === coupleId && c.year === year && c.month === month) || null
  },

  async closeMonth(closure: Omit<MonthClosure, 'id' | 'closedAt'>): Promise<MonthClosure> {
    await delay(300)
    const closures = getItem<MonthClosure[]>(STORAGE_KEYS.CLOSURES) || []
    const existing = closures.find(
      c => c.coupleId === closure.coupleId && c.year === closure.year && c.month === closure.month
    )
    if (existing) throw new Error('Ce mois est déjà clôturé')
    const newClosure: MonthClosure = {
      ...closure,
      id: generateId(),
      closedAt: new Date().toISOString(),
    }
    closures.push(newClosure)
    setItem(STORAGE_KEYS.CLOSURES, closures)
    return newClosure
  },
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}