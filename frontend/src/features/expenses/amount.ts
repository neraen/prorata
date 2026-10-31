/**
 * Amount typed on the custom keypad.
 *
 * The value is carried as the raw French string (`42,90`) rather than a number
 * so the display can show a trailing comma or a single decimal exactly as it
 * was typed, which a number would swallow.
 */

/** Digits before the comma, and digits after it. */
const MAX_INTEGER_DIGITS = 5
const MAX_DECIMALS = 2

export function appendKey(raw: string, key: string): string {
  if (key === ',') {
    if (raw.includes(',')) return raw
    return raw === '' ? '0,' : `${raw},`
  }

  const [integer, decimals] = raw.split(',')

  if (raw.includes(',')) {
    if ((decimals ?? '').length >= MAX_DECIMALS) return raw
    return raw + key
  }

  if (integer === '0') return key
  if (integer.length >= MAX_INTEGER_DIGITS) return raw
  return raw + key
}

export function removeKey(raw: string): string {
  return raw.slice(0, -1)
}

export function rawToCents(raw: string): number {
  if (raw === '') return 0
  const parsed = Number.parseFloat(raw.replace(',', '.'))
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0
}

export function centsToRaw(cents: number): string {
  if (cents === 0) return ''
  return (cents / 100).toFixed(2).replace('.', ',')
}
