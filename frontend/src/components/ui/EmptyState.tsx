import type { ReactNode } from 'react'

interface EmptyStateProps {
  /** An icon component from `components/icons`, never an emoji. */
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      {icon && (
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-track text-muted">
          {icon}
        </span>
      )}
      <h3 className="mb-1.5 text-[17px] font-bold text-ink">{title}</h3>
      {description && <p className="mb-4 text-[13px] leading-relaxed text-muted">{description}</p>}
      {action}
    </div>
  )
}
