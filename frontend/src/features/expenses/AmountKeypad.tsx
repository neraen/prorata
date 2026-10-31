import { BackspaceIcon } from '../../components/icons'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0']

interface AmountKeypadProps {
  onKey: (key: string) => void
  onBackspace: () => void
}

/**
 * The amount is typed here, not on the system keyboard: the screen keeps the
 * split preview and the CTA visible while you type, which a native keyboard
 * would cover.
 */
export function AmountKeypad({ onKey, onBackspace }: AmountKeypadProps) {
  return (
    <div className="no-select grid grid-cols-3 gap-2">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          aria-label={key === ',' ? 'Virgule' : key}
          onClick={() => onKey(key)}
          className="flex h-[52px] items-center justify-center rounded-[14px] bg-surface text-[22px] font-semibold text-ink active:bg-track"
        >
          {key}
        </button>
      ))}
      <button
        type="button"
        aria-label="Effacer"
        onClick={onBackspace}
        className="flex h-[52px] items-center justify-center rounded-[14px] bg-surface text-ink active:bg-track"
      >
        <BackspaceIcon size={24} />
      </button>
    </div>
  )
}
