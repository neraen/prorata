import { type HTMLAttributes, forwardRef } from 'react'

type BadgeVariant = 'positive' | 'negative' | 'neutral'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  positive: 'bg-positive-bg text-positive',
  negative: 'bg-negative-bg text-negative',
  neutral: 'bg-track text-muted',
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', className = '', children, ...props }, ref) => (
    <span
      ref={ref}
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[14px] font-bold ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
)

Badge.displayName = 'Badge'
