import dayjs from 'dayjs'
import 'dayjs/locale/fr'

dayjs.locale('fr')

export function formatMoney(cents: number): string {
  const euros = cents / 100
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(euros)
}

export function formatMoneyShort(cents: number): string {
  const euros = Math.round(cents / 100)
  return `${euros} €`
}

export function formatDate(date: string): string {
  return dayjs(date).format('D MMM YYYY')
}

export function formatMonth(year: number, month: number): string {
  return dayjs().year(year).month(month - 1).format('MMMM YYYY')
}

export function getCurrentYearMonth(): { year: number; month: number } {
  const now = dayjs()
  return { year: now.year(), month: now.month() + 1 }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export const CATEGORY_LABELS: Record<string, string> = {
  groceries: 'Courses',
  leisure: 'Loisirs',
  transport: 'Transport',
  housing: 'Logement',
  health: 'Santé',
  other: 'Autres',
}

export const CATEGORY_ICONS: Record<string, string> = {
  groceries: '🛒',
  leisure: '🎮',
  transport: '🚗',
  housing: '🏠',
  health: '💊',
  other: '📦',
}