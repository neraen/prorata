import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-semibold text-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`h-[52px] w-full rounded-[16px] border bg-surface px-4 text-[16px] text-ink outline-none transition-colors focus:border-ink ${
            error ? 'border-negative' : 'border-border'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-[13px] text-negative">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
