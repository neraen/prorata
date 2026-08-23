import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore, useMonthStore, useToastStore } from '../../lib/stores'
import { personalApi, type ApiPersonalExpense } from '../../lib/api'
import { formatDate, CATEGORY_LABELS, CATEGORY_ICONS, defaultDateInMonth } from '../../lib/utils'
import type { ExpenseCategory } from '../../lib/types'
import {
  Card,
  Button,
  Input,
  Money,
  MonthPicker,
  Badge,
  SegmentedControl,
  EmptyState,
  Modal,
  ConfirmModal,
} from '../../components/ui'

const CATEGORIES: ExpenseCategory[] = [
  'groceries',
  'leisure',
  'transport',
  'housing',
  'health',
  'other',
]

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

export function PersonalPage() {
  const user = useAuthStore((s) => s.user)
  const { year, month } = useMonthStore()
  const showToast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  // The toggle only changes what the page shows; the shared expenses themselves
  // are untouched and still live on the couple side.
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
      category: expense.category as ExpenseCategory,
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
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error')
    },
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Perso</h1>
        <MonthPicker />
      </div>

      {/* Total */}
      <Card>
        <p className="text-text-muted text-sm mb-1">
          {includeShared ? 'Ce que le mois me coûte' : 'Mes dépenses perso'}
        </p>
        <p className="text-3xl font-bold text-text">
          <Money cents={displayedTotal} />
        </p>

        {includeShared && (
          <div className="mt-3 pt-3 border-t border-border flex gap-4 text-sm">
            <span className="text-text-muted">
              Perso <Money cents={personalTotal} className="text-text font-medium" />
            </span>
            <span className="text-text-muted">
              Ma part du commun{' '}
              <Money cents={sharedTotal} className="text-accent font-medium" />
            </span>
          </div>
        )}

        {(personalMonth?.recurringTotalCents ?? 0) > 0 && (
          <p className="text-text-muted text-xs mt-2">
            dont <Money cents={personalMonth!.recurringTotalCents} /> de dépenses récurrentes
          </p>
        )}
      </Card>

      {/* Toggle */}
      <Card className="flex items-center justify-between">
        <div className="min-w-0 pr-3">
          <p className="font-medium text-text">Inclure les dépenses communes</p>
          <p className="text-sm text-text-muted">
            Ajoute ma part des dépenses du couple au total.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={includeShared}
          onClick={() => setIncludeShared((on) => !on)}
          className={`
            relative shrink-0 w-12 h-7 rounded-full transition-colors duration-200
            ${includeShared ? 'bg-accent' : 'bg-border'}
          `}
        >
          <span
            className={`
              absolute top-1 w-5 h-5 rounded-full bg-surface shadow-sm
              transition-all duration-200
              ${includeShared ? 'left-6' : 'left-1'}
            `}
          />
        </button>
      </Card>

      {/* Liste */}
      {isEmpty ? (
        <EmptyState
          icon="🙋"
          title="Aucune dépense perso"
          description="Ajoutez vos dépenses à vous, ponctuelles ou tous les mois."
        />
      ) : (
        <div className="space-y-3">
          {personal.map((expense) => (
            <Card
              key={`personal-${expense.id}`}
              className="flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openEdit(expense)}
            >
              <span className="text-3xl">
                {CATEGORY_ICONS[expense.category] || '💰'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text truncate">{expense.title}</p>
                <p className="text-sm text-text-muted">
                  {formatDate(expense.occurredOn)} • {CATEGORY_LABELS[expense.category] ?? expense.category}
                </p>
                {expense.recurrence === 'monthly' && (
                  <Badge variant="neutral" className="mt-1">
                    ↻ Tous les mois
                  </Badge>
                )}
              </div>
              <p className="font-bold text-text text-lg">
                <Money cents={expense.amountCents} />
              </p>
            </Card>
          ))}

          {/* Dépenses communes: autre couleur, non modifiables ici */}
          {includeShared &&
            shared.map((expense) => (
              <Card
                key={`shared-${expense.id}`}
                className="flex items-center gap-3 bg-accent/5 border-accent/20"
              >
                <span className="text-3xl">
                  {CATEGORY_ICONS[expense.category] || '💰'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-accent truncate">{expense.title}</p>
                  <p className="text-sm text-text-muted">
                    {formatDate(expense.spentAt)} • payé par {expense.paidBy.displayName}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Commune · <Money cents={expense.amountCents} /> au total
                  </p>
                </div>
                <p className="font-bold text-accent text-lg">
                  <Money cents={expense.shareCents} />
                </p>
              </Card>
            ))}
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={openCreate}
        className="
          fixed bottom-24 right-4 md:bottom-8 md:right-8
          w-14 h-14 rounded-full bg-accent text-white
          flex items-center justify-center text-2xl
          shadow-lg hover:bg-accent-hover transition-colors
        "
        aria-label="Ajouter une dépense perso"
      >
        +
      </button>

      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editing ? 'Modifier la dépense perso' : 'Nouvelle dépense perso'}
      >
        <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
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
            {errors.amount && <p className="text-sm text-danger mt-1">{errors.amount.message}</p>}
          </div>

          <Input
            label="Titre"
            placeholder="Ex: Abonnement salle de sport"
            error={errors.title?.message}
            {...register('title')}
          />

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Catégorie</label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => field.onChange(cat)}
                      className={`
                        p-2 rounded-[12px] text-center transition-all
                        ${
                          field.value === cat
                            ? 'bg-accent text-white'
                            : 'bg-background border border-border'
                        }
                      `}
                    >
                      <span className="text-xl block">{CATEGORY_ICONS[cat]}</span>
                      <span className="text-xs">{CATEGORY_LABELS[cat]}</span>
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Fréquence</label>
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
              label="Jusqu'au (optionnel)"
              type="date"
              error={errors.endsOn?.message}
              {...register('endsOn')}
            />
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeForm} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" isLoading={saveMutation.isPending} className="flex-1">
              {editing ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>

          {editing && (
            <Button
              type="button"
              variant="danger"
              onClick={() => setToDelete(editing.id)}
              className="w-full"
            >
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
