import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore, useCoupleStore, useMonthStore } from '../../lib/stores'
import { expensesApi } from '../../lib/api'
import { formatDate, CATEGORY_LABELS, CATEGORY_ICONS } from '../../lib/utils'
import type { ExpenseCategory } from '../../lib/types'
import { Card, Badge, Money, MonthPicker, EmptyState } from '../../components/ui'

const CATEGORIES: (ExpenseCategory | 'all')[] = [
  'all',
  'groceries',
  'leisure',
  'transport',
  'housing',
  'health',
  'other',
]

export function ExpensesPage() {
  const user = useAuthStore((s) => s.user)
  const { couple, partner } = useCoupleStore()
  const { year, month } = useMonthStore()

  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all')
  const [paidByFilter, setPaidByFilter] = useState<number | 'all'>('all')

  const { data: expenseList } = useQuery({
    queryKey: ['expenses', year, month],
    queryFn: () => expensesApi.list(year, month),
    enabled: !!couple,
  })

  if (!couple || !user || !partner) return null

  const expenses = expenseList?.items ?? []
  const isClosed = expenseList?.isClosed ?? false

  const filteredExpenses = expenses.filter((e) => {
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false
    if (paidByFilter !== 'all' && e.paidBy.userId !== paidByFilter) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Dépenses</h1>
        <MonthPicker />
      </div>

      {isClosed && (
        <Badge variant="closed">Mois clôturé - lecture seule</Badge>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`
              px-3 py-1.5 rounded-full text-sm whitespace-nowrap
              transition-colors duration-200
              ${
                categoryFilter === cat
                  ? 'bg-accent text-white'
                  : 'bg-surface border border-border text-text-muted'
              }
            `}
          >
            {cat === 'all' ? 'Tous' : `${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]}`}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setPaidByFilter('all')}
          className={`
            px-3 py-1.5 rounded-full text-sm
            transition-colors duration-200
            ${
              paidByFilter === 'all'
                ? 'bg-accent text-white'
                : 'bg-surface border border-border text-text-muted'
            }
          `}
        >
          Tous
        </button>
        <button
          onClick={() => setPaidByFilter(user.id)}
          className={`
            px-3 py-1.5 rounded-full text-sm
            transition-colors duration-200
            ${
              paidByFilter === user.id
                ? 'bg-secondary text-white'
                : 'bg-surface border border-border text-text-muted'
            }
          `}
        >
          {user.name}
        </button>
        <button
          onClick={() => setPaidByFilter(partner.id)}
          className={`
            px-3 py-1.5 rounded-full text-sm
            transition-colors duration-200
            ${
              paidByFilter === partner.id
                ? 'bg-accent text-white'
                : 'bg-surface border border-border text-text-muted'
            }
          `}
        >
          {partner.name}
        </button>
      </div>

      {/* List */}
      {filteredExpenses.length === 0 ? (
        <EmptyState
          icon="💸"
          title="Aucune dépense"
          description="Ajoutez votre première dépense du mois"
        />
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((expense) => (
            <Link
              key={expense.id}
              to={isClosed ? '#' : `/expenses/${expense.id}/edit`}
              className={isClosed ? 'pointer-events-none' : ''}
            >
              <Card className="flex items-center gap-3 hover:shadow-md transition-shadow">
                <span className="text-3xl">
                  {CATEGORY_ICONS[expense.category as keyof typeof CATEGORY_ICONS] || '💰'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text truncate">{expense.title}</p>
                  <p className="text-sm text-text-muted">
                    {formatDate(expense.spentAt)} • {expense.paidBy.displayName}
                  </p>
                </div>
                <p className="font-bold text-text text-lg">
                  <Money cents={expense.amountCents} />
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* FAB */}
      {!isClosed && (
        <Link
          to="/expenses/new"
          className="
            fixed bottom-24 right-4 md:bottom-8 md:right-8
            w-14 h-14 rounded-full bg-accent text-white
            flex items-center justify-center text-2xl
            shadow-lg hover:bg-accent-hover transition-colors
          "
        >
          +
        </Link>
      )}
    </div>
  )
}