import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useAuthStore, useCoupleStore, useMonthStore, useToastStore } from '../../lib/stores'
import { expensesApi } from '../../lib/api'
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../lib/utils'
import type { ExpenseCategory } from '../../lib/types'
import { Card, Button, Input, SegmentedControl, ConfirmModal } from '../../components/ui'

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
  spentAt: z.string().min(1, 'Date requise'),
  paidByUserId: z.number().min(1, 'Sélectionnez qui a payé'),
})

type FormData = z.infer<typeof schema>

export function ExpenseFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const expenseId = id ? Number(id) : null
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const { couple, partner } = useCoupleStore()
  const { year, month } = useMonthStore()
  const showToast = useToastStore((s) => s.show)

  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Fetch expenses to find the one we're editing
  const { data: expenseList, isLoading: isLoadingExpenses } = useQuery({
    queryKey: ['expenses', year, month],
    queryFn: () => expensesApi.list(year, month),
    enabled: isEdit && !!couple,
  })

  const expense = expenseList?.items.find(e => e.id === expenseId)

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      amount: 0,
      category: 'groceries',
      spentAt: dayjs().format('YYYY-MM-DD'),
      paidByUserId: user?.id || 0,
    },
  })

  useEffect(() => {
    if (expense) {
      reset({
        title: expense.title,
        amount: expense.amountCents / 100,
        category: expense.category as ExpenseCategory,
        spentAt: expense.spentAt,
        paidByUserId: expense.paidBy.userId,
      })
    }
  }, [expense, reset])

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      expensesApi.create({
        title: data.title,
        amountCents: Math.round(data.amount * 100),
        category: data.category,
        currency: 'EUR',
        spentAt: data.spentAt,
        paidByUserId: data.paidByUserId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      showToast('Dépense ajoutée', 'success')
      navigate('/expenses')
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      expensesApi.update(expenseId!, {
        title: data.title,
        amountCents: Math.round(data.amount * 100),
        category: data.category,
        spentAt: data.spentAt,
        paidByUserId: data.paidByUserId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      showToast('Dépense modifiée', 'success')
      navigate('/expenses')
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => expensesApi.delete(expenseId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      showToast('Dépense supprimée', 'success')
      navigate('/expenses')
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error')
    },
  })

  const onSubmit = (data: FormData) => {
    if (isEdit) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  if (!couple || !user || !partner) return null
  if (isEdit && isLoadingExpenses) return <p>Chargement...</p>
  if (isEdit && !expense) return <p>Dépense non trouvée</p>

  const amount = watch('amount')

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text">
        {isEdit ? 'Modifier la dépense' : 'Nouvelle dépense'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Montant */}
        <Card>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Montant
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('amount', { valueAsNumber: true })}
              className="
                flex-1 text-4xl font-bold text-text bg-transparent
                border-none outline-none
              "
              placeholder="0"
            />
            <span className="text-2xl text-text-muted">€</span>
          </div>
          {amount > 0 && (
            <p className="text-sm text-text-muted mt-2">
              {amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </p>
          )}
          {errors.amount && (
            <p className="text-sm text-danger mt-1">{errors.amount.message}</p>
          )}
        </Card>

        {/* Titre */}
        <Input
          label="Titre"
          placeholder="Ex: Courses Carrefour"
          error={errors.title?.message}
          {...register('title')}
        />

        {/* Catégorie */}
        <Card>
          <label className="block text-sm font-medium text-text-muted mb-3">
            Catégorie
          </label>
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
                      p-3 rounded-[12px] text-center transition-all
                      ${
                        field.value === cat
                          ? 'bg-accent text-white'
                          : 'bg-background border border-border'
                      }
                    `}
                  >
                    <span className="text-2xl block mb-1">{CATEGORY_ICONS[cat]}</span>
                    <span className="text-xs">{CATEGORY_LABELS[cat]}</span>
                  </button>
                ))}
              </div>
            )}
          />
        </Card>

        {/* Date */}
        <Input
          label="Date"
          type="date"
          error={errors.spentAt?.message}
          {...register('spentAt')}
        />

        {/* Payé par */}
        <Card>
          <label className="block text-sm font-medium text-text-muted mb-3">
            Payé par
          </label>
          <Controller
            name="paidByUserId"
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
        </Card>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)} className="flex-1">
            Annuler
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="flex-1">
            {isEdit ? 'Modifier' : 'Ajouter'}
          </Button>
        </div>

        {isEdit && (
          <Button
            type="button"
            variant="danger"
            onClick={() => setShowDeleteModal(true)}
            className="w-full"
          >
            Supprimer
          </Button>
        )}
      </form>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => deleteMutation.mutate()}
        isLoading={deleteMutation.isPending}
        title="Supprimer la dépense"
        message="Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="danger"
      />
    </div>
  )
}