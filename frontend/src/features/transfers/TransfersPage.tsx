import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { monthsApi, transfersApi, type ApiTransfer } from '../../lib/api'
import { useAuthStore, useCoupleStore, useMonthStore, useToastStore } from '../../lib/stores'
import { defaultDateInMonth, formatDayHeader, formatMoney } from '../../lib/utils'
import { ArrowLeftRightIcon, ArrowRightIcon, PlusIcon, TrashIcon } from '../../components/icons'
import {
  Avatar,
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  Input,
  Modal,
  SegmentedControl,
} from '../../components/ui'

export function TransfersPage() {
  const user = useAuthStore((s) => s.user)
  const { couple, partner } = useCoupleStore()
  // The form dates a new transfer inside the month being looked at elsewhere,
  // so a settlement lands on the month it regularises.
  const { year, month } = useMonthStore()
  const showToast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [toDelete, setToDelete] = useState<number | null>(null)
  const [amount, setAmount] = useState('')
  const [fromUserId, setFromUserId] = useState<number>(user?.id ?? 0)
  const [transferredAt, setTransferredAt] = useState(() => defaultDateInMonth(year, month))
  const [note, setNote] = useState('')

  const { data: transferList } = useQuery({
    queryKey: ['transfers'],
    queryFn: () => transfersApi.list(),
    enabled: !!couple,
  })

  const { data: overall } = useQuery({
    queryKey: ['overall'],
    queryFn: () => monthsApi.overall(),
    enabled: !!couple,
  })

  const transfers = useMemo(() => transferList?.items ?? [], [transferList])

  const days = useMemo(() => {
    const byDay = new Map<string, ApiTransfer[]>()
    for (const transfer of transfers) {
      const existing = byDay.get(transfer.transferredAt)
      if (existing) existing.push(transfer)
      else byDay.set(transfer.transferredAt, [transfer])
    }
    return [...byDay.entries()].sort(([a], [b]) => (a < b ? 1 : -1))
  }, [transfers])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['transfers'] })
    queryClient.invalidateQueries({ queryKey: ['balance'] })
    queryClient.invalidateQueries({ queryKey: ['overall'] })
  }

  const resetForm = () => {
    setAmount('')
    setFromUserId(user?.id ?? 0)
    setTransferredAt(defaultDateInMonth(year, month))
    setNote('')
  }

  const createMutation = useMutation({
    mutationFn: () =>
      transfersApi.create({
        fromUserId,
        toUserId: fromUserId === user!.id ? partner!.id : user!.id,
        amountCents: Math.round(Number(amount.replace(',', '.')) * 100),
        currency: 'EUR',
        transferredAt,
        note: note.trim() || null,
      }),
    onSuccess: () => {
      invalidate()
      showToast('Virement enregistré', 'success')
      setShowForm(false)
      resetForm()
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Erreur', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => transfersApi.delete(id),
    onSuccess: () => {
      invalidate()
      showToast('Virement supprimé', 'success')
      setToDelete(null)
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error')
      setToDelete(null)
    },
  })

  if (!couple || !user || !partner) return null

  /** Standing position across every month, transfers already deducted. */
  const netSelf = overall?.members.find((m) => m.userId === user.id)?.netDeltaCents ?? 0
  const dueCents = Math.abs(netSelf)
  const isSettled = dueCents === 0
  const creditor = netSelf > 0 ? user : partner
  const debtor = netSelf > 0 ? partner : user

  const amountCents = Math.round(Number(amount.replace(',', '.') || '0') * 100)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-12 items-center justify-between">
        <h1 className="text-[28px] font-extrabold tracking-[-0.03em]">Virements</h1>
        <button
          type="button"
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          aria-label="Ajouter un virement"
          className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-border bg-surface text-ink"
        >
          <PlusIcon size={20} strokeWidth={2} />
        </button>
      </div>

      {/* Position cumulée */}
      <div className="flex flex-col gap-5 rounded-[24px] bg-ink p-6 text-white">
        <div className="flex flex-col gap-1.5">
          <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-on-ink-muted">
            {isSettled ? 'Tous mois confondus' : 'Reste à verser'}
          </div>
          <div className="text-[48px] font-extrabold leading-none tracking-[-0.04em]">
            {isSettled ? 'Tout est réglé' : formatMoney(dueCents)}
          </div>
        </div>
        {!isSettled && (
          <div className="flex items-center gap-2.5 text-[15px] font-semibold">
            <Avatar name={debtor.name} isSelf={debtor.id === user.id} size={32} />
            <span>{debtor.name}</span>
            <span className="text-on-ink-muted">
              <ArrowRightIcon size={20} />
            </span>
            <Avatar name={creditor.name} isSelf={creditor.id === user.id} size={32} />
            <span>{creditor.name}</span>
          </div>
        )}
      </div>

      {days.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRightIcon size={24} />}
          title="Aucun virement"
          description="Enregistre ici l'argent que vous vous êtes réellement versé."
        />
      ) : (
        days.map(([date, items]) => (
          <div key={date} className="flex flex-col gap-2">
            <div className="px-1 pt-1.5 text-[13px] font-semibold text-muted">
              {formatDayHeader(date)}
            </div>
            <Card padding="none" className="px-4">
              {items.map((transfer, index) => (
                <div
                  key={transfer.id}
                  className={`flex items-center gap-3 py-3 ${
                    index < items.length - 1 ? 'border-b border-track' : ''
                  }`}
                >
                  <Avatar
                    name={transfer.fromUser.displayName}
                    isSelf={transfer.fromUser.userId === user.id}
                    size={36}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-semibold">
                      {transfer.fromUser.displayName} → {transfer.toUser.displayName}
                    </span>
                    {transfer.note && (
                      <span className="truncate text-[12px] text-muted">{transfer.note}</span>
                    )}
                  </div>
                  <span className="shrink-0 text-[15px] font-bold">
                    {formatMoney(transfer.amountCents)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setToDelete(transfer.id)}
                    aria-label="Supprimer le virement"
                    className="shrink-0 p-1 text-placeholder"
                  >
                    <TrashIcon size={18} />
                  </button>
                </div>
              ))}
            </Card>
          </div>
        ))
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nouveau virement">
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-center gap-1.5 py-2">
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^\d,.]/g, ''))}
              placeholder="0"
              aria-label="Montant"
              className="w-32 border-0 bg-transparent text-center text-[40px] font-extrabold tracking-[-0.04em] text-ink outline-none"
            />
            <span className="text-[24px] font-bold text-placeholder">€</span>
          </div>

          <SegmentedControl
            options={[
              { value: user.id, label: user.name },
              { value: partner.id, label: partner.name },
            ]}
            value={fromUserId}
            onChange={setFromUserId}
          />
          <p className="-mt-2 text-[12px] text-muted">
            Versé par {fromUserId === user.id ? user.name : partner.name}
          </p>

          <Input
            label="Date"
            type="date"
            value={transferredAt}
            max={dayjs().format('YYYY-MM-DD')}
            onChange={(event) => setTransferredAt(event.target.value)}
          />

          <Input
            label="Note (facultatif)"
            placeholder="Ex. régularisation octobre"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />

          <div className="flex gap-2.5">
            <Button variant="secondary" onClick={() => setShowForm(false)} className="flex-1">
              Annuler
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={amountCents <= 0}
              isLoading={createMutation.isPending}
              className="flex-1"
            >
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => deleteMutation.mutate(toDelete!)}
        isLoading={deleteMutation.isPending}
        title="Supprimer le virement"
        message="Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="danger"
      />
    </div>
  )
}
