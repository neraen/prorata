import { useToastStore } from '../../lib/stores'

export function Toast() {
  const { message, type, hide } = useToastStore()

  if (!message) return null

  return (
    <div
      role="status"
      onClick={hide}
      className={`fixed bottom-[104px] left-1/2 z-50 -translate-x-1/2 rounded-[16px] px-5 py-3 text-[14px] font-semibold shadow-fab ${
        type === 'success' ? 'bg-ink text-white' : 'bg-negative text-white'
      }`}
    >
      {message}
    </div>
  )
}
