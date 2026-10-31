interface SegmentedControlProps<T extends string | number> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  /** `alt` is the lighter track used when the control sits inside a white card. */
  tone?: 'default' | 'alt'
  className?: string
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  tone = 'default',
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`grid gap-1 rounded-[14px] p-1 ${
        tone === 'alt' ? 'bg-segment-bg-alt' : 'bg-segment-bg'
      } ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const isActive = value === option.value
        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className={`h-10 rounded-[11px] text-[14px] transition-colors ${
              isActive ? 'bg-surface font-bold text-ink shadow-segment' : 'font-semibold text-muted'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
