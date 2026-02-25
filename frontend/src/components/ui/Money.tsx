import { formatMoney, formatMoneyShort } from '../../lib/utils'

interface MoneyProps {
  cents: number
  short?: boolean
  className?: string
}

export function Money({ cents, short = false, className = '' }: MoneyProps) {
  const formatted = short ? formatMoneyShort(cents) : formatMoney(cents)
  return <span className={className}>{formatted}</span>
}