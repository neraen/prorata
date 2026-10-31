import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  expensesApi,
  monthsApi,
  personalApi,
  type ApiExpense,
  type SplitMode,
} from '../../lib/api'
import { useAuthStore, useCoupleStore, useMonthStore, useToastStore } from '../../lib/stores'
import {
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  categoryColors,
  defaultDateInMonth,
  formatDayShort,
  formatMoney,
} from '../../lib/utils'
import { CATEGORY_ICON_COMPONENTS, CalendarIcon, CloseIcon, TrashIcon } from '../../components/icons'
import {
  Avatar,
  Button,
  Card,
  ConfirmModal,
  SegmentedControl,
  SplitBar,
} from '../../components/ui'
import { AmountKeypad } from './AmountKeypad'
import { appendKey, centsToRaw, rawToCents, removeKey } from './amount'

/** The category picked last is the one pre-selected next time. */
const LAST_CATEGORY_KEY = 'prorata_last_category'

type Scope = 'shared' | 'personal'

/**
 * Add / edit expense. In edit mode the form is only mounted once its expense is
 * loaded, so every field can be initialised from it directly — no effect
 * syncing props into state, and no flash of an empty form.
 */
export function ExpenseFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const expenseId = id ? Number(id) : null
  const { couple } = useCoupleStore()
  const { year, month } = useMonthStore()

  const { data: expenseList, isLoading } = useQuery({
    queryKey: ['expenses', year, month],
    queryFn: () => expensesApi.list(year, month),
    enabled: isEdit && !!couple,
  })

  if (!isEdit) return <ExpenseForm />

  if (isLoading) {
    return <p className="py-10 text-center text-[14px] text-muted">Chargement…</p>
  }

  const expense = expenseList?.items.find((e) => e.id === expenseId)
  if (!expense) {
    return <p className="py-10 text-center text-[14px] text-muted">Dépense introuvable</p>
  }

  return <ExpenseForm key={expense.id} expense={expense} />
}

function ExpenseForm({ expense }: { expense?: ApiExpense }) {
  const isEdit = !!expense
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const { couple, partner } = useCoupleStore()
  const { year, month } = useMonthStore()
  const showToast = useToastStore((s) => s.show)

  const [scope, setScope] = useState<Scope>('shared')
  const [raw, setRaw] = useState(() => (expense ? centsToRaw(expense.amountCents) : ''))
  const [title, setTitle] = useState(expense?.title ?? '')
  const [category, setCategory] = useState<string>(
    () => expense?.category ?? localStorage.getItem(LAST_CATEGORY_KEY) ?? 'groceries'
  )
  const [spentAt, setSpentAt] = useState(() => expense?.spentAt ?? defaultDateInMonth(year, month))
  const [paidByUserId, setPaidByUserId] = useState<number>(
    expense?.paidBy.userId ?? user?.id ?? 0
  )
  const [splitMode, setSplitMode] = useState<SplitMode>(expense?.splitMode ?? 'prorata')
  const [chargedToUserId, setChargedToUserId] = useState<number | null>(
    expense?.chargedTo?.userId ?? null
  )
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // The month's weights come from the API, so the preview and the real
  // computation can never disagree.
  const { data: balance } = useQuery({
    queryKey: ['balance', year, month],
    queryFn: () => monthsApi.balance(year, month),
    enabled: !!couple,
  })

  const amountCents = rawToCents(raw)

  const onSaved = (message: string, personal: boolean) => {
    localStorage.setItem(LAST_CATEGORY_KEY, category)
    queryClient.invalidateQueries({ queryKey: ['expenses'] })
    queryClient.invalidateQueries({ queryKey: ['balance'] })
    queryClient.invalidateQueries({ queryKey: ['overall'] })
    queryClient.invalidateQueries({ queryKey: ['personal'] })
    showToast(message, 'success')
    navigate(personal ? '/personal' : '/expenses')
  }

  const onFailed = (err: unknown) =>
    showToast(err instanceof Error ? err.message : 'Erreur', 'error')

  const sharedPayload = () => ({
    title: title.trim(),
    category,
    amountCents,
    currency: 'EUR',
    spentAt,
    paidByUserId,
    splitMode,
    chargedToUserId: splitMode === 'full' ? chargedToUserId : null,
  })

  const createShared = useMutation({
    mutationFn: () => expensesApi.create(sharedPayload()),
    onSuccess: () => onSaved('Dépense ajoutée', false),
    onError: onFailed,
  })

  const createPersonal = useMutation({
    mutationFn: () =>
      personalApi.create({
        title: title.trim(),
        category,
        amountCents,
        currency: 'EUR',
        recurrence: 'none',
        startsOn: spentAt,
      }),
    onSuccess: () => onSaved('Dépense perso ajoutée', true),
    onError: onFailed,
  })

  const updateShared = useMutation({
    mutationFn: () => expensesApi.update(expense!.id, sharedPayload()),
    onSuccess: () => onSaved('Dépense modifiée', false),
    onError: onFailed,
  })

  const deleteShared = useMutation({
    mutationFn: () => expensesApi.delete(expense!.id),
    onSuccess: () => onSaved('Dépense supprimée', false),
    onError: onFailed,
  })

  if (!couple || !user || !partner) return null

  const weightSelf = balance?.members.find((m) => m.userId === user.id)?.weight ?? 0.5

  /** Share of each member for the amount being typed. */
  const shares = (() => {
    if (splitMode === 'equal') {
      const half = Math.round(amountCents / 2)
      return { self: half, partner: amountCents - half, percentSelf: 50 }
    }
    if (splitMode === 'full') {
      const onSelf = (chargedToUserId ?? partner.id) === user.id
      return {
        self: onSelf ? amountCents : 0,
        partner: onSelf ? 0 : amountCents,
        percentSelf: onSelf ? 100 : 0,
      }
    }
    const selfShare = Math.round(amountCents * weightSelf)
    return {
      self: selfShare,
      partner: amountCents - selfShare,
      percentSelf: Math.round(weightSelf * 100),
    }
  })()

  const isToday = spentAt === dayjs().format('YYYY-MM-DD')
  const canSubmit = amountCents > 0 && title.trim().length >= 2
  const isSaving = createShared.isPending || createPersonal.isPending || updateShared.isPending

  const submit = () => {
    if (!canSubmit) return
    if (isEdit) return updateShared.mutate()
    if (scope === 'personal') return createPersonal.mutate()
    createShared.mutate()
  }

  const ctaLabel = () => {
    if (amountCents === 0) return 'Saisis un montant'
    if (title.trim().length < 2) return 'Donne un titre'
    return `${isEdit ? 'Enregistrer' : 'Ajouter'} ${formatMoney(amountCents)}`
  }

  const payerButton = (person: { id: number; name: string }, isSelf: boolean) => {
    const isSelected = paidByUserId === person.id
    const palette = isSelf
      ? { border: 'border-clement', bg: 'bg-clement-select', text: 'text-clement-strong' }
      : { border: 'border-laetitia-solid', bg: 'bg-laetitia-select', text: 'text-laetitia-strong' }

    return (
      <button
        key={person.id}
        type="button"
        onClick={() => setPaidByUserId(person.id)}
        aria-pressed={isSelected}
        className={`flex h-12 items-center justify-center gap-2 rounded-[14px] text-[14px] ${
          isSelected
            ? `border-2 ${palette.border} ${palette.bg} font-bold ${palette.text}`
            : 'border border-border bg-surface font-semibold text-ink'
        }`}
      >
        <Avatar name={person.name} isSelf={isSelf} size={26} solid={isSelected} />
        {person.name}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3.5">
      {/* Barre */}
      <div className="flex h-11 items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Fermer"
          className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-border bg-surface text-ink"
        >
          <CloseIcon size={20} />
        </button>
        <div className="text-[17px] font-bold">
          {isEdit ? 'Modifier la dépense' : 'Nouvelle dépense'}
        </div>
        <label className="relative flex h-11 cursor-pointer items-center gap-1.5 rounded-[14px] border border-border bg-surface px-3 text-[13px] font-semibold text-ink">
          <CalendarIcon size={16} />
          {isToday ? "Aujourd'hui" : formatDayShort(spentAt)}
          <input
            type="date"
            value={spentAt}
            onChange={(event) => setSpentAt(event.target.value)}
            aria-label="Date de la dépense"
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>

      {/* Commune / Perso — une dépense perso n'entre pas dans le partage */}
      {!isEdit && (
        <SegmentedControl
          options={[
            { value: 'shared', label: 'Commune' },
            { value: 'personal', label: 'Perso' },
          ]}
          value={scope}
          onChange={setScope}
        />
      )}

      {/* Montant */}
      <div className="flex h-[76px] items-baseline justify-center gap-1.5">
        <span className="text-[60px] font-extrabold leading-none tracking-[-0.04em]">
          {raw === '' ? '0' : raw}
        </span>
        <span className="text-[30px] font-bold text-placeholder">€</span>
      </div>

      {/* Titre */}
      <label className="flex flex-col">
        <span className="sr-only">Titre de la dépense</span>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Titre — ex. Courses Leclerc"
          className="h-[52px] rounded-[16px] border border-border bg-surface px-4 text-[16px] text-ink outline-none focus:border-ink"
        />
      </label>

      {/* Catégories */}
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        {CATEGORY_KEYS.map((key) => {
          const Glyph = CATEGORY_ICON_COMPONENTS[key]
          const isSelected = category === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
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

      {scope === 'shared' ? (
        <>
          {/* Payé par */}
          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-[14px] font-semibold text-muted">Payé par</span>
            <div className="grid flex-1 grid-cols-2 gap-2">
              {payerButton(user, true)}
              {payerButton(partner, false)}
            </div>
          </div>

          {/* Partage — hors maquette, conserve les modes 50/50 et « pour un seul » */}
          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-[14px] font-semibold text-muted">Partage</span>
            <SegmentedControl
              className="flex-1"
              options={[
                { value: 'prorata', label: 'Prorata' },
                { value: 'equal', label: '50 / 50' },
                { value: 'full', label: 'Pour un seul' },
              ]}
              value={splitMode}
              onChange={(value) => {
                setSplitMode(value)
                if (value === 'full' && chargedToUserId === null) setChargedToUserId(partner.id)
              }}
            />
          </div>

          {splitMode === 'full' && (
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-[14px] font-semibold text-muted">À la charge</span>
              <div className="grid flex-1 grid-cols-2 gap-2">
                {[
                  { person: user, isSelf: true },
                  { person: partner, isSelf: false },
                ].map(({ person, isSelf }) => {
                  const isSelected = (chargedToUserId ?? partner.id) === person.id
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => setChargedToUserId(person.id)}
                      aria-pressed={isSelected}
                      className={`flex h-12 items-center justify-center gap-2 rounded-[14px] text-[14px] ${
                        isSelected
                          ? 'border-2 border-ink bg-surface font-bold text-ink'
                          : 'border border-border bg-surface font-semibold text-muted'
                      }`}
                    >
                      <Avatar name={person.name} isSelf={isSelf} size={26} />
                      {person.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Aperçu de la répartition */}
          <Card
            radius="md"
            padding="none"
            className="flex min-h-[60px] flex-col justify-center gap-2 px-4 py-3"
          >
            <SplitBar percentSelf={shares.percentSelf} height={6} />
            <div className="flex justify-between text-[13px]">
              <span>
                <span className="text-muted">Part {user.name} </span>
                <strong className="text-clement-text">{formatMoney(shares.self)}</strong>
              </span>
              <span>
                <span className="text-muted">Part {partner.name} </span>
                <strong className="text-laetitia-text">{formatMoney(shares.partner)}</strong>
              </span>
            </div>
          </Card>
        </>
      ) : (
        <Card radius="md" padding="none" className="flex min-h-[60px] items-center px-4 py-3">
          <p className="text-[13px] leading-relaxed text-muted">
            Dépense perso : elle reste dans ton suivi et n'entre pas dans le partage.
          </p>
        </Card>
      )}

      <AmountKeypad
        onKey={(key) => setRaw((current) => appendKey(current, key))}
        onBackspace={() => setRaw(removeKey)}
      />

      <Button
        onClick={submit}
        disabled={!canSubmit}
        isLoading={isSaving}
        className="h-14 rounded-[18px] text-[16px]"
      >
        {ctaLabel()}
      </Button>

      {isEdit && (
        <Button variant="danger" onClick={() => setShowDeleteModal(true)} className="gap-2">
          <TrashIcon size={18} />
          Supprimer
        </Button>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => deleteShared.mutate()}
        isLoading={deleteShared.isPending}
        title="Supprimer la dépense"
        message="Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="danger"
      />
    </div>
  )
}
