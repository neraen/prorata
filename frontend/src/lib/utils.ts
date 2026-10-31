import dayjs from 'dayjs'
import 'dayjs/locale/fr'

dayjs.locale('fr')

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
})

export function formatMoney(cents: number): string {
  return EURO.format(cents / 100)
}

const EURO_ROUND = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** Whole euros, for the illustrative figures of the Réglages preview. */
export function formatMoneyShort(cents: number): string {
  return EURO_ROUND.format(cents / 100)
}

/**
 * Amount with an explicit sign, as the balance badges show it.
 *
 * Uses a real minus sign (U+2212) rather than a hyphen so `+83,15 €` and
 * `−83,15 €` have the same width and the two badges stay aligned.
 */
export function formatMoneySigned(cents: number): string {
  if (cents === 0) return formatMoney(0)
  const sign = cents > 0 ? '+' : '−'
  return `${sign}${formatMoney(Math.abs(cents))}`
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatDate(date: string): string {
  return dayjs(date).format('D MMM YYYY')
}

/** Day header of a grouped list: `Samedi 24 octobre`. */
export function formatDayHeader(date: string): string {
  return capitalize(dayjs(date).format('dddd D MMMM'))
}

/** Compact date of a list row: `Sam. 24 oct.`. */
export function formatDayShort(date: string): string {
  return capitalize(dayjs(date).format('ddd D MMM'))
}

export function formatMonth(year: number, month: number): string {
  return capitalize(
    dayjs()
      .year(year)
      .month(month - 1)
      .format('MMMM YYYY')
  )
}

/** Month as the chip on the Dépenses screen shows it: `Oct. 2026`. */
export function formatMonthShort(year: number, month: number): string {
  return capitalize(
    dayjs()
      .year(year)
      .month(month - 1)
      .format('MMM YYYY')
  )
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

/** True while the given month is the one we are living in: there is no "next". */
export function isCurrentMonth(year: number, month: number): boolean {
  const now = getCurrentYearMonth()
  return now.year === year && now.month === month
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const shifted = dayjs()
    .year(year)
    .month(month - 1)
    .date(1)
    .add(delta, 'month')
  return { year: shifted.year(), month: shifted.month() + 1 }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

/** First letter of a display name, for the round avatars. */
export function initialOf(name: string): string {
  return (name.trim().charAt(0) || '?').toUpperCase()
}

export const CATEGORY_LABELS: Record<string, string> = {
  groceries: 'Courses',
  leisure: 'Loisirs',
  transport: 'Transport',
  housing: 'Logement',
  health: 'Santé',
  other: 'Autres',
}

export const CATEGORY_KEYS = [
  'groceries',
  'leisure',
  'transport',
  'housing',
  'health',
  'other',
] as const

export type CategoryKey = (typeof CATEGORY_KEYS)[number]

/**
 * Tile background and glyph colour of each category.
 *
 * Tailwind classes rather than raw hex, so a token change in `index.css`
 * reaches every tile at once.
 */
export const CATEGORY_COLORS: Record<string, { tile: string; glyph: string }> = {
  groceries: { tile: 'bg-cat-courses-bg', glyph: 'text-cat-courses' },
  leisure: { tile: 'bg-cat-loisirs-bg', glyph: 'text-cat-loisirs' },
  transport: { tile: 'bg-cat-transport-bg', glyph: 'text-cat-transport' },
  housing: { tile: 'bg-cat-logement-bg', glyph: 'text-cat-logement' },
  health: { tile: 'bg-cat-sante-bg', glyph: 'text-cat-sante' },
  other: { tile: 'bg-cat-autres-bg', glyph: 'text-cat-autres' },
}

export function categoryColors(category: string): { tile: string; glyph: string } {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other
}

/**
 * The two person palettes of the design.
 *
 * The mockups give the signed-in member the blue palette and the partner the
 * orange one; `self` keeps that mapping whoever is logged in.
 */
export interface PersonPalette {
  tint: string
  text: string
  solid: string
  bar: string
  select: string
  selectBorder: string
  strong: string
}

export const PERSON_PALETTES: { self: PersonPalette; partner: PersonPalette } = {
  self: {
    tint: 'bg-clement-tint',
    text: 'text-clement-text',
    solid: 'bg-clement',
    bar: 'bg-clement',
    select: 'bg-clement-select',
    selectBorder: 'border-clement',
    strong: 'text-clement-strong',
  },
  partner: {
    tint: 'bg-laetitia-tint',
    text: 'text-laetitia-text',
    solid: 'bg-laetitia-solid',
    bar: 'bg-laetitia',
    select: 'bg-laetitia-select',
    selectBorder: 'border-laetitia-solid',
    strong: 'text-laetitia-strong',
  },
}

export function paletteFor(isSelf: boolean): PersonPalette {
  return isSelf ? PERSON_PALETTES.self : PERSON_PALETTES.partner
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
