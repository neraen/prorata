import { useToastStore } from '../../lib/stores'

export function Toast() {
  const { message, type, hide } = useToastStore()

  if (!message) return null

  return (
    <div
      className={`
        fixed bottom-24 left-1/2 -translate-x-1/2 z-50
        px-6 py-3 rounded-[16px] shadow-lg
        text-white text-sm font-medium
        animate-in fade-in slide-in-from-bottom-4 duration-300
        ${type === 'success' ? 'bg-success' : 'bg-danger'}
      `}
      onClick={hide}
    >
      {message}
    </div>
  )
}