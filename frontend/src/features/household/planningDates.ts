/** Calendar dates are calculated at local noon to avoid DST midnight shifts. */
export function calendarDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function validPlanningDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && calendarDate(new Date(`${value}T12:00:00`)) === value
}
export function shiftPlanningDate(start: string, days: number): string {
  const date = new Date(`${start}T12:00:00`)
  date.setDate(date.getDate() + days)
  return calendarDate(date)
}
export function planningDates(start: string): string[] {
  return Array.from({ length: 7 }, (_, index) => shiftPlanningDate(start, index))
}
/** Keep a future chosen start; afterwards advance by full calendar weeks. */
export function currentPlanningStart(anchor?: string | null, now = new Date()): string {
  const today = calendarDate(now)
  if (validPlanningDate(anchor)) {
    if (anchor > today) return anchor
    const elapsed = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${anchor}T00:00:00Z`)) / 86400000)
    return shiftPlanningDate(anchor, Math.floor(elapsed / 7) * 7)
  }
  return shiftPlanningDate(today, -(now.getDay() + 6) % 7)
}
