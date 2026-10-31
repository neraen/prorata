import { type ButtonHTMLAttributes, forwardRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'onInk' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  isLoading?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-white disabled:bg-disabled disabled:text-muted',
  secondary: 'bg-surface text-ink border border-border',
  /** White button sitting on the black balance card. */
  onInk: 'bg-white text-ink',
  danger: 'bg-surface border border-border text-negative',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', isLoading, className = '', children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={`flex h-[52px] items-center justify-center rounded-[16px] px-4 text-[15px] font-bold transition-colors disabled:cursor-not-allowed ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Chargement…
        </span>
      ) : (
        children
      )}
    </button>
  )
)

Button.displayName = 'Button'
