import { useEffect, useRef, useState } from 'react'
import { useMonthStore } from '../../lib/stores'
import { addMonths, formatMonth, formatMonthShort, getCurrentYearMonth } from '../../lib/utils'
import { ChevronDownIcon } from '../icons'

/** How far back the picker lets you go. */
const MONTHS_BACK = 18

/**
 * Compact month picker of the Dépenses screen: a chip that drops a list of the
 * recent months. Same store as the Accueil selector, so the two stay in step.
 */
export function MonthMenu() {
  const { year, month, setMonth } = useMonthStore()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  const current = getCurrentYearMonth()
  const months = Array.from({ length: MONTHS_BACK }, (_, index) =>
    addMonths(current.year, current.month, -index)
  )

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex h-11 items-center gap-1.5 rounded-[14px] border border-border bg-surface px-3.5 text-[14px] font-semibold text-ink"
      >
        {formatMonthShort(year, month)}
        <ChevronDownIcon size={16} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-20 mt-2 max-h-72 w-48 overflow-y-auto rounded-[16px] border border-border bg-surface p-1 shadow-fab">
          {months.map((entry) => {
            const isSelected = entry.year === year && entry.month === month
            return (
              <button
                key={`${entry.year}-${entry.month}`}
                type="button"
                onClick={() => {
                  setMonth(entry.year, entry.month)
                  setIsOpen(false)
                }}
                className={`flex h-11 w-full items-center rounded-[12px] px-3 text-left text-[14px] ${
                  isSelected ? 'bg-ink font-bold text-white' : 'font-semibold text-ink'
                }`}
              >
                {formatMonth(entry.year, entry.month)}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
