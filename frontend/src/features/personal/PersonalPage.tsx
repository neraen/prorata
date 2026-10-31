import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore, useMonthStore, useToastStore } from '../../lib/stores'
import { personalApi, type ApiPersonalExpense } from '../../lib/api'
import {
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  categoryColors,
  defaultDateInMonth,
  formatDayShort,
  formatMoney,
} from '../../lib/utils'
import {
  CATEGORY_ICON_COMPONENTS,
  ChevronLeftIcon,
  PackageIcon,
  PlusIcon,
} from '../../components/icons'
import {
  Badge,
  Button,
  Card,
  CategoryTile,
  ConfirmModal,
  EmptyState,
  Input,
  Modal,
  MonthMenu,
  SegmentedControl,
} from '../../components/ui'

const schema = z.object({
  title: z.string().min(2, 'Le titre doit faire au moins 2 caractères'),
  amount: z.number().positive('Le montant doit être positif'),
  category: z.enum(['groceries', 'leisure', 'transport', 'housing', 'health', 'other']),
  recurrence: z.enum(['none', 'monthly']),
  startsOn: z.string().min(1, 'Date requise'),
  endsOn: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const emptyForm = (year: number, month: number): FormData => ({
  title: '',
  amount: 0,
  category: 'other',
  recurrence: 'none',
  startsOn: defaultDateInMonth(year, month),
  endsOn: '',
})

/**
 * Personal expenses — private to the signed-in member.
 *
 * The redesign drops the Perso tab: this screen is reached from Réglages, and
 * new personal expenses are created from the Commune/Perso segment of the add
 * screen. Shared expenses can be folded in to answer "what does this month
 * actually cost me".
 */
export function PersonalPage() {
  const user = useAuthStore((s) => s.user)
  const { year, month } = useMonthStore()
  const showToast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [includeShared, setIncludeShared] = useState(false)
  const [editing, setEditing] = useState<ApiPersonalExpense | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [toDelete, setToDelete] = useState<number | null>(null)

  const { data: personalMonth } = useQuery({
    queryKey: ['personal', year, month],
    queryFn: () => personalApi.month(year, month),
    enabled: !!user,
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: emptyForm(year, month),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['personal'] })
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
    reset(emptyForm(year, month))
  }

  const openCreate = () => {
    setEditing(null)
    reset(emptyForm(year, month))
    setShowForm(true)
  }

  const openEdit = (expense: ApiPersonalExpense) => {
    setEditing(expense)
    reset({
      title: expense.title,
      amount: expense.amountCents / 100,
      category: expense.category as FormData['category'],
      recurrence: expense.recurrence,
      startsOn: expense.startsOn,
      endsOn: expense.endsOn ?? '',
    })
    setShowForm(true)
  }

  const toPayload = (data: FormData) => ({
    title: data.title,
    category: data.category,
    amountCents: Math.round(data.amount * 100),
    currency: 'EUR',
    recurrence: data.recurrence,
    startsOn: data.startsOn,
    endsOn: data.recurrence === 'monthly' && data.endsOn ? data.endsOn : null,
  })

  const saveMutation = useMutation({
    mutationFn: (data: FormData) =>
      editing
        ? personalApi.update(editing.id, {
            ...toPayload(data),
            // An emptied end date has to be cleared explicitly
            clearEndsOn: !(data.recurrence === 'monthly' && data.endsOn),
          })
        : personalApi.create(toPayload(data)),
    onSuccess: () => {
      invalidate()
      showToast(editing ? 'Dépense perso modifiée' : 'Dépense perso ajoutée', 'success')
      closeForm()
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Erreur', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => personalApi.delete(id),
    onSuccess: () => {
      invalidate()
      showToast('Dépense perso supprimée', 'success')
      setToDelete(null)
      closeForm()
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error')
      setToDelete(null)
    },
  })

  if (!user) return null

  const recurrence = watch('recurrence')
  const personal = personalMonth?.personal ?? []
  const shared = personalMonth?.shared ?? []
  const personalTotal = personalMonth?.personalTotalCents ?? 0
  const sharedTotal = personalMonth?.sharedTotalCents ?? 0
  const displayedTotal = includeShared ? personalTotal + sharedTotal : personalTotal
  const isEmpty = personal.length === 0 && (!includeShared || shared.length === 0)

  return (
    <div className="flex flex-col gap-3.5">
      {/* Titre */}
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={() => navigate('/settings')}
            aria-label="Retour aux réglages"
            className="-ml-2 flex h-11 w-9 items-center justify-center text-ink"
          >
            <ChevronLeftIcon size={22} />
          </button>
          <h1 className="text-[28px] font-extrabold tracking-[-0.03em]">Perso</h1>
        </div>
        <MonthMenu />
      </div>

      {/* Total */}
      <div className="flex flex-col gap-5 rounded-[24px] bg-ink p-6 text-white">
        <div className="flex flex-col gap-1.5">
          <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-on-ink-muted">
            {includeShared ? 'Ce que le mois me coûte' : 'Mes dépenses perso'}
          </div>
          <div className="text-[48px] font-extrabold leading-none tracking-[-0.04em]">
            {formatMoney(displayedTotal)}
          </div>
        </div>

        {includeShared && (
          <div className="flex gap-4 text-[13px] text-on-ink-muted">
            <span>
              Perso <strong className="text-white">{formatMoney(personalTotal)}</strong>
            </span>
            <span>
              Ma part du commun <strong className="text-white">{formatMoney(sharedTotal)}</strong>
            </span>
          </div>
        )}

        {(personalMonth?.recurringTotalCents ?? 0) > 0 && (
          <div className="text-[12px] text-on-ink-muted">
            dont {formatMoney(personalMonth!.recurringTotalCents)} de dépenses récurrentes
          </div>
        )}
      </div>

      {/* Inclure le commun */}
      <Card radius="md" className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">Inclure les dépenses communes</p>
          <p className="text-[12px] text-muted">Ajoute ma part des dépenses du couple au total.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={includeShared}
          aria-label="Inclure les dépenses communes"
          onClick={() => setIncludeShared((on) => !on)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            includeShared ? 'bg-ink' : 'bg-track'
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-surface shadow-segment transition-all ${
              includeShared ? 'left-6' : 'left-1'
            }`}
          />
        </button>
      </Card>

      {/* Liste */}
      {isEmpty ? (
        <EmptyState
          icon={<PackageIcon size={24} strokeWidth={2} />}
          title="Aucune dépense perso"
          description="Ajoute tes dépenses à toi, ponctuelles ou tous les mois."
        />
      ) : (
        <Card padding="none" className="px-4">
          {personal.map((expense, index) => (
            <button
              key={`personal-${expense.id}`}
              type="button"
              onClick={() => openEdit(expense)}
              className={`flex w-full items-center gap-3 py-3 text-left ${
                index < personal.length - 1 || (includeShared && shared.length > 0)
                  ? 'border-b border-track'
                  : ''
              }`}
            >
              <CategoryTile category={expense.category} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] font-semibold">{expense.title}</span>
                <span className="truncate text-[12px] text-muted">
                  {formatDayShort(expense.occurredOn)} ·{' '}
                  {CATEGORY_LABELS[expense.category] ?? expense.category}
                </span>
              </div>
              {expense.recurrence === 'monthly' && (
                <Badge className="shrink-0 text-[12px]">Tous les mois</Badge>
              )}
              <span className="shrink-0 text-[15px] font-bold">
                {formatMoney(expense.amountCents)}
              </span>
            </button>
          ))}

          {/* Part des dépenses communes — non modifiables ici */}
          {includeShared &&
            shared.map((expense, index) => (
              <div
                key={`shared-${expense.id}`}
                className={`flex items-center gap-3 py-3 ${
                  index < shared.length - 1 ? 'border-b border-track' : ''
                }`}
              >
                <CategoryTile category={expense.category} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-semibold text-muted">
                    {expense.title}
                  </span>
                  <span className="truncate text-[12px] text-muted">
                    Commune · {formatMoney(expense.amountCents)} au total · payé par{' '}
                    {expense.paidBy.displayName}
                  </span>
                </div>
                <span className="shrink-0 text-[15px] font-bold text-muted">
                  {formatMoney(expense.shareCents)}
                </span>
              </div>
            ))}
        </Card>
      )}

      <Button variant="secondary" onClick={openCreate} className="gap-2">
        <PlusIcon size={18} strokeWidth={2} />
        Ajouter une dépense perso
      </Button>

      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editing ? 'Modifier la dépense perso' : 'Nouvelle dépense perso'}
      >
        <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="flex flex-col gap-4">
          <div className="flex items-baseline justify-center gap-1.5 py-2">
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('amount', { valueAsNumber: true })}
              placeholder="0"
              aria-label="Montant"
              className="w-36 border-0 bg-transparent text-center text-[40px] font-extrabold tracking-[-0.04em] text-ink outline-none"
            />
            <span className="text-[24px] font-bold text-placeholder">€</span>
          </div>
          {errors.amount && <p className="-mt-3 text-[13px] text-negative">{errors.amount.message}</p>}

          <Input
            label="Titre"
            placeholder="Ex. abonnement salle de sport"
            error={errors.title?.message}
            {...register('title')}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-muted">Catégorie</span>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <div className="no-scrollbar flex gap-2 overflow-x-auto">
                  {CATEGORY_KEYS.map((key) => {
                    const Glyph = CATEGORY_ICON_COMPONENTS[key]
                    const isSelected = field.value === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => field.onChange(key)}
                        aria-pressed={isSelected}
                        className={`flex h-11 shrink-0 items-center gap-2 rounded-full border pl-2.5 pr-3.5 text-[14px] ${
                          isSelected
                            ? 'border-ink bg-ink font-bold text-white'
                            : 'border-border bg-surface font-semibold text-ink'
                        }`}
                      >
                        <span className={isSelected ? 'text-white' : categoryColors(key).glyph}>
                          <Glyph size={20} />
                        </span>
                        {CATEGORY_LABELS[key]}
                      </button>
                    )
                  })}
                </div>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-muted">Fréquence</span>
            <Controller
              name="recurrence"
              control={control}
              render={({ field }) => (
                <SegmentedControl
                  options={[
                    { value: 'none', label: 'Ponctuelle' },
                    { value: 'monthly', label: 'Tous les mois' },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <Input
            label={recurrence === 'monthly' ? 'À partir du' : 'Date'}
            type="date"
            error={errors.startsOn?.message}
            {...register('startsOn')}
          />

          {recurrence === 'monthly' && (
            <Input
              label="Jusqu'au (facultatif)"
              type="date"
              error={errors.endsOn?.message}
              {...register('endsOn')}
            />
          )}

          <div className="flex gap-2.5">
            <Button type="button" variant="secondary" onClick={closeForm} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" isLoading={saveMutation.isPending} className="flex-1">
              {editing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>

          {editing && (
            <Button type="button" variant="danger" onClick={() => setToDelete(editing.id)}>
              Supprimer
            </Button>
          )}
        </form>
      </Modal>

      <ConfirmModal
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => deleteMutation.mutate(toDelete!)}
        isLoading={deleteMutation.isPending}
        title="Supprimer la dépense perso"
        message="Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="danger"
      />
    </div>
  )
}
