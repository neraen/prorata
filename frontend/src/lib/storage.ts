const STORAGE_KEYS = {
  USERS: 'prorata_users',
  CURRENT_USER: 'prorata_current_user',
  COUPLES: 'prorata_couples',
  EXPENSES: 'prorata_expenses',
  CLOSURES: 'prorata_closures',
} as const

export function getItem<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  } catch {
    return null
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function removeItem(key: string): void {
  localStorage.removeItem(key)
}

export { STORAGE_KEYS }