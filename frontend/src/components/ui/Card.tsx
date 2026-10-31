import { type HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 16px on the small side-by-side cards, 20px standard, 24px on the balance card. */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  /** 24px corners for the settings and balance cards, 20px for the rest. */
  radius?: 'md' | 'lg' | 'xl'
}

const paddingStyles: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

const radiusStyles: Record<NonNullable<CardProps['radius']>, string> = {
  md: 'rounded-[16px]',
  lg: 'rounded-[20px]',
  xl: 'rounded-[24px]',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = 'md', radius = 'lg', className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`bg-surface border border-border ${radiusStyles[radius]} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
)

Card.displayName = 'Card'
