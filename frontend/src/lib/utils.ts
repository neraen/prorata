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

/**
 * Date to pre-fill a form with while a given month is being looked at.
 *
 * Defaults to today when that month is the current one, and to the 1st
 * otherwise: an entry dated outside the selected month would immediately drop
 * out of the list being consulted.
 */
export function defaultDateInMonth(year: number, month: number): string {
  const monthStart = dayjs(`${year}-${String(month).padStart(2, '0')}-01`)
  const today = dayjs()

  return today.isSame(monthStart, 'month')
    ? today.format('YYYY-MM-DD')
    : monthStart.format('YYYY-MM-DD')
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

export const SPLIT_MODE_LABELS: Record<string, string> = {
  prorata: 'Prorata',
  equal: '50/50',
  full: 'Pour un seul',
}

export const SPLIT_MODE_HINTS: Record<string, string> = {
  prorata: 'Répartie selon vos parts habituelles.',
  equal: 'Coupée en deux, quelles que soient vos parts.',
  full: 'Entièrement à la charge de la personne choisie.',
}

export const CATEGORY_ICONS: Record<string, string> = {
  groceries: '🛒',
  leisure: '🎮',
  transport: '🚗',
  housing: '🏠',
  health: '💊',
  other: '📦',
}