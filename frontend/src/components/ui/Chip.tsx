import type { ReactNode } from 'react'

interface ChipProps {
  isActive?: boolean
  onClick?: () => void
  children: ReactNode
  /** 40px for filters, 44px for the category picker. */
  height?: 40 | 44
  className?: string
}

/** Pill of the scrollable filter and category rows. */
export function Chip({ isActive = false, onClick, children, height = 40, className = '' }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border text-[14px] transition-colors ${
        isActive
          ? 'border-ink bg-ink font-bold text-white'
          : 'border-border bg-surface font-semibold text-ink'
      } ${className}`}
      style={{ height, paddingLeft: 14, paddingRight: 14 }}
    >
      {children}
    </button>
  )
}

/** The 1px rule that separates the "who paid" chips from the category chips. */
export function ChipDivider() {
  return <div className="my-1.5 mx-0.5 w-px shrink-0 bg-border" />
}
