interface SplitBarProps {
  /** Share of the signed-in member, 0–100. */
  percentSelf: number
  /** 8px on the Accueil mini-card, 6px in the form preview, 10px in Réglages. */
  height?: 6 | 8 | 10
  className?: string
}

/**
 * The two-tone share bar. The second segment takes the remaining width rather
 * than a computed percentage, so the pair always fills the track exactly.
 */
export function SplitBar({ percentSelf, height = 8, className = '' }: SplitBarProps) {
  const clamped = Math.max(0, Math.min(100, percentSelf))

  return (
    <div
      className={`flex gap-[2px] overflow-hidden ${className}`}
      style={{ height, borderRadius: height / 2 }}
    >
      <div className="bg-clement" style={{ width: `${clamped}%` }} />
      <div className="flex-1 bg-laetitia" />
    </div>
  )
}

interface ProgressBarProps {
  /** 0–100. */
  percent: number
  isSelf: boolean
  className?: string
}

/** Single-colour 6px bar used under each member in « Qui a payé quoi ». */
export function ProgressBar({ percent, isSelf, className = '' }: ProgressBarProps) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-[3px] bg-track ${className}`}>
      <div
        className={`h-1.5 ${isSelf ? 'bg-clement' : 'bg-laetitia'}`}
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  )
}
