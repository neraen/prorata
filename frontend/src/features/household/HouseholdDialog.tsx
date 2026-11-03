import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { CloseIcon } from '../../components/icons'

export function HouseholdDialog({ title, onClose, children, fixedLayout = false }: { title: string; onClose: () => void; children: ReactNode; fixedLayout?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    function fit() {
      const viewport = window.visualViewport
      if (!dialog || !viewport) return
      dialog.style.maxHeight = `${viewport.height - 24}px`
      if (fixedLayout) dialog.style.height = `${Math.min(window.innerHeight * 0.9, viewport.height - 24)}px`
      // Avoid centering a dialog behind an iOS keyboard (layout viewport stays tall).
      if (viewport.height < window.innerHeight - 100) {
        dialog.style.top = `${viewport.offsetTop + 12}px`
        dialog.style.bottom = 'auto'
        dialog.style.marginTop = '0'
      } else {
        dialog.style.top = ''; dialog.style.bottom = ''; dialog.style.marginTop = ''
      }
    }
    fit()
    window.visualViewport?.addEventListener('resize', fit)
    window.visualViewport?.addEventListener('scroll', fit)
    return () => { dialog?.close(); window.visualViewport?.removeEventListener('resize', fit); window.visualViewport?.removeEventListener('scroll', fit) }
  }, [fixedLayout])
  return <dialog ref={ref} aria-label={title} onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose() }} className={`fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-24px)] max-w-[456px] rounded-[24px] bg-surface p-5 text-ink backdrop:bg-ink/40 ${fixedLayout ? 'open:flex open:flex-col overflow-hidden' : 'overflow-y-auto'}`}>
    <div className="mb-4 flex shrink-0 items-center justify-between gap-2"><h2 className="text-xl font-extrabold">{title}</h2><button autoFocus type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bg" aria-label="Fermer"><CloseIcon size={20} /></button></div>
    {fixedLayout ? <div className="flex min-h-0 flex-1 flex-col">{children}</div> : children}
  </dialog>
}
