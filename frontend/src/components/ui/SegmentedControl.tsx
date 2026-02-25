interface SegmentedControlProps<T extends string | number> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div className={`flex bg-border/50 rounded-[16px] p-1 ${className}`}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          className={`
            flex-1 px-4 py-2 rounded-[12px] text-sm font-medium
            transition-all duration-200
            ${
              value === option.value
                ? 'bg-surface text-text shadow-sm'
                : 'text-text-muted hover:text-text'
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}