import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore, useCoupleStore, useMonthStore, useToastStore } from '../../lib/stores'
import { monthsApi, expensesApi } from '../../lib/api'
import { formatMonth, CATEGORY_ICONS } from '../../lib/utils'
import { Card, Badge, Button, Money, MonthPicker, ConfirmModal } from '../../components/ui'

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { couple, partner } = useCoupleStore()
  const { year, month } = useMonthStore()
  const showToast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const [showCloseModal, setShowCloseModal] = useState(false)

  const { data: balance } = useQuery({
    queryKey: ['balance', year, month],
    queryFn: () => monthsApi.balance(year, month),
    enabled: !!couple,
  })

  const { data: expenseList } = useQuery({
    queryKey: ['expenses', year, month],
    queryFn: () => expensesApi.list(year, month),
    enabled: !!couple,
  })

  const closeMutation = useMutation({
    mutationFn: () => monthsApi.close(year, month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      queryClient.invalidateQueries({ queryKey: ['history'] })
      showToast('Mois clôturé avec succès', 'success')
      setShowCloseModal(false)
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error')
    },
  })

  if (!couple || !user || !partner) return null

  const isClosed = balance?.isClosed ?? false
  const expenses = expenseList?.items ?? []
  const recentExpenses = expenses.slice(0, 3)

  // Find current user and partner in balance
  const memberA = balance?.members.find(m => m.userId === user.id)
  const memberB = balance?.members.find(m => m.userId === partner.id)

  const percentA = memberA ? Math.round(memberA.weight * 100) : 50
  const percentB = 100 - percentA

  const getSettlementMessage = () => {
    if (!balance?.settlement || balance.settlement.amountCents === 0) {
      return "Vous êtes à l'équilibre"
    }
    const fromUser = balance.settlement.fromUserId === user.id ? user : partner
    const toUser = balance.settlement.toUserId === user.id ? user : partner
    const amount = Math.round(balance.settlement.amountCents / 100)
    return `${fromUser.name} doit ${amount} € à ${toUser.name}`
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <MonthPicker />
        <div className="flex items-center gap-2">
          <Badge variant="clara">{user.name}</Badge>
          <span className="text-text-muted">&</span>
          <Badge variant="julien">{partner.name}</Badge>
        </div>
      </div>

      {isClosed && (
        <div className="flex items-center gap-2">
          <Badge variant="closed">Mois clôturé</Badge>
        </div>
      )}

      {/* Total du mois */}
      <Card>
        <p className="text-text-muted text-sm mb-1">Total du mois</p>
        <p className="text-3xl font-bold text-text">
          <Money cents={balance?.totalCents ?? 0} />
        </p>
      </Card>

      {/* Solde principal */}
      <Card className="bg-accent/5 border-accent/20">
        <p className="text-text-muted text-sm mb-2">Solde de régularisation</p>
        <p className="text-2xl font-bold text-accent">{getSettlementMessage()}</p>
      </Card>

      {/* Barre de répartition */}
      <Card>
        <p className="text-text-muted text-sm mb-3">Répartition</p>
        <div className="flex rounded-full overflow-hidden h-4 mb-3">
          <div
            className="bg-secondary transition-all duration-300"
            style={{ width: `${percentA}%` }}
          />
          <div
            className="bg-accent transition-all duration-300"
            style={{ width: `${percentB}%` }}
          />
        </div>
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-secondary" />
            <span className="text-text-muted">
              {user.name} {percentA}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-muted">
              {partner.name} {percentB}%
            </span>
            <span className="w-3 h-3 rounded-full bg-accent" />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-text-muted">Part théorique</p>
            <p className="font-medium">
              {user.name}: <Money cents={memberA?.targetCents ?? 0} />
            </p>
            <p className="font-medium">
              {partner.name}: <Money cents={memberB?.targetCents ?? 0} />
            </p>
          </div>
          <div>
            <p className="text-text-muted">Payé</p>
            <p className="font-medium">
              {user.name}: <Money cents={memberA?.paidCents ?? 0} />
            </p>
            <p className="font-medium">
              {partner.name}: <Money cents={memberB?.paidCents ?? 0} />
            </p>
          </div>
        </div>
      </Card>

      {/* Clôturer */}
      {!isClosed && expenses.length > 0 && (
        <Button onClick={() => setShowCloseModal(true)} className="w-full">
          Clôturer le mois
        </Button>
      )}

      {/* Dernières dépenses */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-text">Dernières dépenses</p>
          <Link to="/expenses" className="text-accent text-sm font-medium">
            Voir tout
          </Link>
        </div>

        {recentExpenses.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-4">
            Aucune dépense ce mois
          </p>
        ) : (
          <div className="space-y-3">
            {recentExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center gap-3">
                <span className="text-2xl">
                  {CATEGORY_ICONS[expense.category as keyof typeof CATEGORY_ICONS] || '💰'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text truncate">{expense.title}</p>
                  <p className="text-sm text-text-muted">
                    {expense.paidBy.displayName}
                  </p>
                </div>
                <p className="font-semibold text-text">
                  <Money cents={expense.amountCents} />
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmModal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        onConfirm={() => closeMutation.mutate()}
        isLoading={closeMutation.isPending}
        title="Clôturer le mois"
        message={`Voulez-vous clôturer ${formatMonth(year, month)} ? Les dépenses ne pourront plus être modifiées.`}
        confirmLabel="Clôturer"
      />
    </div>
  )
}