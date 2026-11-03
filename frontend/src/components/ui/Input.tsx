import { type InputHTMLAttributes, forwardRef, useId, useState } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const [visible, setVisible] = useState(false)
    const password = props.type === 'password'
    const generatedId = useId()
    const inputId = id || generatedId
    const errorId = `${inputId}-error`

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-semibold text-muted">
            {label}
          </label>
        )}
        <div className="relative">
        <input
          ref={ref}
          id={inputId}
          className={`h-[52px] w-full rounded-[16px] border bg-surface px-4 text-[16px] text-ink outline-none transition-colors focus:border-ink ${
            error ? 'border-negative' : 'border-border'
          } ${password ? 'pr-24' : ''} ${className}`}
          {...props}
          type={password && visible ? 'text' : props.type}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={[props['aria-describedby'], error ? errorId : null].filter(Boolean).join(' ') || undefined}
        />
        {password && <button type="button" aria-controls={inputId} aria-pressed={visible} onClick={() => setVisible(!visible)} className="absolute inset-y-0 right-1 min-w-20 rounded-xl px-3 text-xs font-bold text-ink">{visible ? 'Masquer' : 'Afficher'}<span className="sr-only"> le mot de passe</span></button>}
        </div>
        {error && <p id={errorId} role="alert" className="text-[13px] text-negative">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
