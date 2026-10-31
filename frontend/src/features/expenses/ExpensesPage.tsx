import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { expensesApi, type ApiExpense } from '../../lib/api'
import { useAuthStore, useCoupleStore, useMonthStore } from '../../lib/stores'
import {
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  formatDayHeader,
  formatMoney,
  formatMonth,
} from '../../lib/utils'
import { ListIcon, LockIcon, SearchIcon } from '../../components/icons'
import {
  Avatar,
  Card,
  CategoryTile,
  Chip,
  ChipDivider,
  EmptyState,
  MonthMenu,
} from '../../components/ui'

type PaidByFilter = number | 'all'
type CategoryFilter = string | 'all'

export function ExpensesPage() {
  const user = useAuthStore((s) => s.user)
  const { couple, partner } = useCoupleStore()
  const { year, month } = useMonthStore()

  const [search, setSearch] = useState('')
  const [paidBy, setPaidBy] = useState<PaidByFilter>('all')
  const [category, setCategory] = useState<CategoryFilter>('all')

  const { data: expenseList } = useQuery({
    queryKey: ['expenses', year, month],
    queryFn: () => expensesApi.list(year, month),
    enabled: !!couple,
  })

  const expenses = useMemo(() => expenseList?.items ?? [], [expenseList])

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return expenses.filter((expense) => {
      if (paidBy !== 'all' && expense.paidBy.userId !== paidBy) return false
      if (category !== 'all' && expense.category !== category) return false
      if (needle && !expense.title.toLowerCase().includes(needle)) return false
      return true
    })
  }, [expenses, paidBy, category, search])

  /** Days, most recent first, each with its own subtotal. */
  const days = useMemo(() => {
    const byDay = new Map<string, ApiExpense[]>()
    for (const expense of filtered) {
      const existing = byDay.get(expense.spentAt)
      if (existing) existing.push(expense)
      else byDay.set(expense.spentAt, [expense])
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, items]) => ({
        date,
        items,
        totalCents: items.reduce((sum, item) => sum + item.amountCents, 0),
      }))
  }, [filtered])

  if (!couple || !user || !partner) return null

  const isClosed = expenseList?.isClosed ?? false
  const visibleTotal = filtered.reduce((sum, expense) => sum + expense.amountCents, 0)

  return (
    <div className="flex flex-col gap-3.5">
      {/* Titre */}
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="text-[28px] font-extrabold tracking-[-0.03em]">Dépenses</h1>
          <div className="truncate text-[14px] text-muted">
            {formatMonth(year, month)} · <strong className="text-ink">{formatMoney(visibleTotal)}</strong>
          </div>
        </div>
        <MonthMenu />
      </div>

      {isClosed && (
        <div className="flex items-center gap-2 text-[13px] font-semibold text-muted">
          <LockIcon size={16} />
          Mois clôturé — lecture seule
        </div>
      )}

      {/* Recherche */}
      <label className="flex h-12 items-center gap-2.5 rounded-[14px] border border-border bg-surface px-3.5">
        <span className="text-muted">
          <SearchIcon size={18} />
        </span>
        <span className="sr-only">Rechercher une dépense</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher…"
          className="flex-1 border-0 bg-transparent text-[15px] text-ink outline-none"
        />
      </label>

      {/* Filtres */}
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        <Chip isActive={paidBy === 'all' && category === 'all'} onClick={() => {
          setPaidBy('all')
          setCategory('all')
        }}>
          Tout
        </Chip>
        {[
          { person: user, isSelf: true },
          { person: partner, isSelf: false },
        ].map(({ person, isSelf }) => (
          <Chip
            key={person.id}
            isActive={paidBy === person.id}
            onClick={() => setPaidBy((current) => (current === person.id ? 'all' : person.id))}
          >
            <Avatar name={person.name} isSelf={isSelf} size={26} />
            {person.name}
          </Chip>
        ))}

        <ChipDivider />

        {CATEGORY_KEYS.map((key) => (
          <Chip
            key={key}
            isActive={category === key}
            onClick={() => setCategory((current) => (current === key ? 'all' : key))}
          >
            {CATEGORY_LABELS[key]}
          </Chip>
        ))}
      </div>

      {/* Liste groupée par jour */}
      {days.length === 0 ? (
        <EmptyState
          icon={<ListIcon size={24} />}
          title={expenses.length === 0 ? 'Aucune dépense' : 'Aucun résultat'}
          description={
            expenses.length === 0
              ? 'Appuie sur + pour ajouter la première dépense du mois.'
              : 'Aucune dépense ne correspond à cette recherche.'
          }
        />
      ) : (
        days.map((day) => (
          <div key={day.date} className="flex flex-col gap-2">
            <div className="flex justify-between px-1 pt-1.5 text-[13px] font-semibold text-muted">
              <span>{formatDayHeader(day.date)}</span>
              <span>{formatMoney(day.totalCents)}</span>
            </div>
            <Card padding="none" className="px-4">
              {day.items.map((expense, index) => (
                <Link
                  key={expense.id}
                  to={isClosed ? '#' : `/expenses/${expense.id}/edit`}
                  className={`flex items-center gap-3 py-3 ${
                    index < day.items.length - 1 ? 'border-b border-track' : ''
                  } ${isClosed ? 'pointer-events-none' : ''}`}
                >
                  <CategoryTile category={expense.category} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">{expense.title}</span>
                    <span className="truncate text-[12px] text-muted">
                      {CATEGORY_LABELS[expense.category] ?? expense.category} · payé par{' '}
                      {expense.paidBy.displayName}
                    </span>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-[15px] font-bold">
                    {formatMoney(expense.amountCents)}
                  </span>
                </Link>
              ))}
            </Card>
          </div>
        ))
      )}
    </div>
  )
}
