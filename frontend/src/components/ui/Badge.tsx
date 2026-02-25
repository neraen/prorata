import { type HTMLAttributes, forwardRef } from 'react'

type BadgeVariant = 'clara' | 'julien' | 'neutral' | 'success' | 'closed'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  clara: 'bg-secondary/30 text-accent',
  julien: 'bg-accent/20 text-accent',
  neutral: 'bg-border text-text-muted',
  success: 'bg-success/20 text-success',
  closed: 'bg-text-muted/20 text-text-muted',
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', className = '', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
          ${variantStyles[variant]}
          ${className}
        `}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'