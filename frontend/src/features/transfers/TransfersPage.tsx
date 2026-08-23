import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore, useCoupleStore, useMonthStore, useToastStore } from '../../lib/stores'
import { transfersApi, monthsApi } from '../../lib/api'
import { formatDate, defaultDateInMonth } from '../../lib/utils'
import {
  Card,
  Button,
  Input,
  Money,
  SegmentedControl,
  EmptyState,
  Modal,
  ConfirmModal,
} from '../../components/ui'

const schema = z.object({
  amount: z.number().positive('Le montant doit être positif'),
  fromUserId: z.number().min(1, 'Sélectionnez qui a versé'),
  transferredAt: z.string().min(1, 'Date requise'),
  note: z.string().max(255).optional(),
})

type FormData = z.infer<typeof schema>

export function TransfersPage() {
  const user = useAuthStore((s) => s.user)
  const { couple, partner } = useCoupleStore()
  // This page lists every transfer, but the date follows the month selected
  // elsewhere in the app, so a settlement lands on the month being worked on.
  const { year, month } = useMonthStore()
  const showToast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [transferToDelete, setTransferToDelete] = useState<number | null>(null)

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

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: 0,
      fromUserId: user?.id ?? 0,
      transferredAt: defaultDateInMonth(year, month),
      note: '',
    },
  })

  const blankTransfer = () => ({
    amount: 0,
    fromUserId: user?.id ?? 0,
    transferredAt: defaultDateInMonth(year, month),
    note: '',
  })

  const openForm = () => {
    reset(blankTransfer())
    setShowForm(true)
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['transfers'] })
    queryClient.invalidateQueries({ queryKey: ['balance'] })
    queryClient.invalidateQueries({ queryKey: ['overall'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      transfersApi.create({
        fromUserId: data.fromUserId,
        toUserId: data.fromUserId === user!.id ? partner!.id : user!.id,
        amountCents: Math.round(data.amount * 100),
        currency: 'EUR',
        transferredAt: data.transferredAt,
        note: data.note || null,
      }),
    onSuccess: () => {
      invalidate()
      showToast('Virement enregistré', 'success')
      setShowForm(false)
      reset(blankTransfer())
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => transfersApi.delete(id),
    onSuccess: () => {
      invalidate()
      showToast('Virement supprimé', 'success')
      setTransferToDelete(null)
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error')
      setTransferToDelete(null)
    },
  })

  if (!couple || !user || !partner) return null

  const transfers = transferList?.items ?? []

  const settlement = overall?.settlement
  const remainingMessage = () => {
    if (!settlement || settlement.amountCents === 0) {
      return 'Tout est réglé entre vous.'
    }
    const from = settlement.fromUserId === user.id ? user.name : partner.name
    const to = settlement.toUserId === user.id ? user.name : partner.name
    return `${from} doit encore verser à ${to}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Virements</h1>
        <Button onClick={openForm}>Ajouter</Button>
      </div>

      {/* Reste à verser */}
      <Card className="bg-accent/5 border-accent/20">
        <p className="text-text-muted text-sm mb-1">Reste à verser</p>
        <p className="text-lg font-semibold text-text">{remainingMessage()}</p>
        {settlement && settlement.amountCents > 0 && (
          <p className="text-3xl font-bold text-accent mt-1">
            <Money cents={settlement.amountCents} />
          </p>
        )}
      </Card>

      {/* Historique */}
      {transfers.length === 0 ? (
        <EmptyState
          icon="🏦"
          title="Aucun virement"
          description="Enregistrez ici l'argent que vous vous êtes réellement versé."
        />
      ) : (
        <div className="space-y-3">
          {transfers.map((transfer) => (
            <Card key={transfer.id} className="flex items-center gap-3">
              <span className="text-3xl">🏦</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text truncate">
                  {transfer.fromUser.displayName} → {transfer.toUser.displayName}
                </p>
                <p className="text-sm text-text-muted">
                  {formatDate(transfer.transferredAt)}
                  {transfer.note ? ` • ${transfer.note}` : ''}
                </p>
              </div>
              <p className="font-bold text-text text-lg">
                <Money cents={transfer.amountCents} />
              </p>
              <button
                type="button"
                onClick={() => setTransferToDelete(transfer.id)}
                className="text-text-muted hover:text-danger px-2 text-lg"
                aria-label="Supprimer le virement"
              >
                ×
              </button>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Nouveau virement"
      >
        <form
          onSubmit={handleSubmit((data) => createMutation.mutate(data))}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Montant</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('amount', { valueAsNumber: true })}
                className="flex-1 text-3xl font-bold text-text bg-transparent border-none outline-none"
                placeholder="0"
              />
              <span className="text-2xl text-text-muted">€</span>
            </div>
            {errors.amount && (
              <p className="text-sm text-danger mt-1">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Versé par</label>
            <Controller
              name="fromUserId"
              control={control}
              render={({ field }) => (
                <SegmentedControl
                  options={[
                    { value: user.id, label: user.name },
                    { value: partner.id, label: partner.name },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <Input
            label="Date"
            type="date"
            error={errors.transferredAt?.message}
            {...register('transferredAt')}
          />

          <Input
            label="Note (optionnel)"
            placeholder="Ex: régularisation janvier"
            error={errors.note?.message}
            {...register('note')}
          />

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowForm(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button type="submit" isLoading={isSubmitting || createMutation.isPending} className="flex-1">
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={transferToDelete !== null}
        onClose={() => setTransferToDelete(null)}
        onConfirm={() => deleteMutation.mutate(transferToDelete!)}
        isLoading={deleteMutation.isPending}
        title="Supprimer le virement"
        message="Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="danger"
      />
    </div>
  )
}
