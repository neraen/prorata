import { useMonthStore } from '../../lib/stores'
import { addMonths, formatMonth, isCurrentMonth } from '../../lib/utils'
import { ChevronLeftIcon, ChevronRightIcon } from '../icons'

/**
 * The month navigator of the Accueil screen — it replaces the old Historique
 * tab: browsing a past month is how you look at its balance.
 *
 * There is no month after the current one, so the right arrow greys out
 * instead of letting you walk into the future.
 */
export function MonthSelector() {
  const { year, month, setMonth } = useMonthStore()
  const atCurrentMonth = isCurrentMonth(year, month)

  const go = (delta: number) => {
    const next = addMonths(year, month, delta)
    setMonth(next.year, next.month)
  }

  return (
    <div className="flex items-center justify-between rounded-[16px] border border-border bg-surface p-1">
      <button
        type="button"
        aria-label="Mois précédent"
        onClick={() => go(-1)}
        className="flex h-11 w-11 items-center justify-center rounded-[12px] text-ink"
      >
        <ChevronLeftIcon size={20} />
      </button>
      <div className="text-[16px] font-bold">{formatMonth(year, month)}</div>
      <button
        type="button"
        aria-label="Mois suivant"
        onClick={() => go(1)}
        disabled={atCurrentMonth}
        className={`flex h-11 w-11 items-center justify-center rounded-[12px] ${
          atCurrentMonth ? 'text-arrow-off' : 'text-ink'
        }`}
      >
        <ChevronRightIcon size={20} />
      </button>
    </div>
  )
}
