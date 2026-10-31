import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore, useCoupleStore, useMonthStore, useToastStore } from '../../lib/stores'
import { expensesApi, monthsApi, transfersApi } from '../../lib/api'
import {
  defaultDateInMonth,
  formatDayShort,
  formatMoney,
  formatMoneySigned,
  formatMonth,
} from '../../lib/utils'
import { ArrowRightIcon, CopyIcon, LockIcon } from '../../components/icons'
import {
  Avatar,
  AvatarPair,
  Badge,
  Button,
  Card,
  CategoryTile,
  ConfirmModal,
  MonthSelector,
  ProgressBar,
  SplitBar,
} from '../../components/ui'

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

  const settleMutation = useMutation({
    mutationFn: (payload: { fromUserId: number; toUserId: number; amountCents: number }) =>
      transfersApi.create({
        ...payload,
        currency: balance?.currency ?? 'EUR',
        transferredAt: defaultDateInMonth(year, month),
        note: `Régularisation ${formatMonth(year, month)}`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      queryClient.invalidateQueries({ queryKey: ['transfers'] })
      queryClient.invalidateQueries({ queryKey: ['overall'] })
      showToast('Virement enregistré', 'success')
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Erreur', 'error'),
  })

  const closeMutation = useMutation({
    mutationFn: () => monthsApi.close(year, month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      queryClient.invalidateQueries({ queryKey: ['overall'] })
      showToast('Mois clôturé', 'success')
      setShowCloseModal(false)
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Erreur', 'error'),
  })

  if (!couple || !user || !partner) return null

  const expenses = expenseList?.items ?? []
  const isClosed = balance?.isClosed ?? false

  const self = balance?.members.find((m) => m.userId === user.id)
  const other = balance?.members.find((m) => m.userId === partner.id)

  /**
   * What is left to regularise, transfers of the month already deducted.
   *
   * Reading `netDeltaCents` rather than the gross settlement is what keeps the
   * card honest: once the transfer is recorded the card says it is settled
   * instead of still asking for the money.
   */
  const netSelf = self?.netDeltaCents ?? 0
  const dueCents = Math.abs(netSelf)
  const isSettled = dueCents === 0
  const creditor = netSelf > 0 ? user : partner
  const debtor = netSelf > 0 ? partner : user

  const percentSelf = self ? Math.round(self.weight * 100) : 50

  const copyAmount = async () => {
    const plain = (dueCents / 100).toFixed(2).replace('.', ',')
    try {
      await navigator.clipboard.writeText(plain)
      showToast('Montant copié', 'success')
    } catch {
      showToast('Copie impossible', 'error')
    }
  }

  const shareRow = (
    member: typeof self,
    person: { id: number; name: string },
    isSelf: boolean
  ) => {
    if (!member) return null
    const reference = Math.max(member.paidCents, member.targetCents)
    const percent = reference === 0 ? 0 : Math.round((member.paidCents / reference) * 100)

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <Avatar name={person.name} isSelf={isSelf} size={32} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-[15px] font-bold">{person.name}</span>
            <span className="text-[12px] text-muted">
              {formatMoney(member.paidCents)} / {formatMoney(member.targetCents)}
            </span>
          </div>
          <Badge variant={member.deltaCents >= 0 ? 'positive' : 'negative'}>
            {formatMoneySigned(member.deltaCents)}
          </Badge>
        </div>
        <ProgressBar percent={percent} isSelf={isSelf} />
      </div>
    )
  }

  const recentExpenses = expenses.slice(0, 3)

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex h-12 items-center justify-between">
        <div className="text-[22px] font-extrabold tracking-[-0.03em]">Prorata</div>
        <AvatarPair selfName={user.name} partnerName={partner.name} />
      </div>

      <MonthSelector />

      {isClosed && (
        <div className="flex items-center gap-2 text-[13px] font-semibold text-muted">
          <LockIcon size={16} />
          Mois clôturé — lecture seule
        </div>
      )}

      {/* Carte solde */}
      <div className="flex flex-col gap-5 rounded-[24px] bg-ink p-6 text-white">
        <div className="flex flex-col gap-1.5">
          <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-on-ink-muted">
            {isSettled ? 'Ce mois-ci' : 'À régulariser'}
          </div>
          <div className="text-[48px] font-extrabold leading-none tracking-[-0.04em]">
            {isSettled ? 'Tout est réglé' : formatMoney(dueCents)}
          </div>
        </div>

        {isSettled ? (
          <div className="text-[15px] font-semibold text-on-ink-muted">
            Personne ne doit rien à l'autre sur {formatMonth(year, month).toLowerCase()}.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 text-[15px] font-semibold">
              <Avatar name={debtor.name} isSelf={debtor.id === user.id} size={32} />
              <span>{debtor.name}</span>
              <span className="text-on-ink-muted">
                <ArrowRightIcon size={20} />
              </span>
              <Avatar name={creditor.name} isSelf={creditor.id === user.id} size={32} />
              <span>{creditor.name}</span>
            </div>

            <div className="flex gap-2.5">
              <Button
                variant="onInk"
                className="h-12 flex-1 rounded-[14px]"
                isLoading={settleMutation.isPending}
                onClick={() =>
                  settleMutation.mutate({
                    fromUserId: debtor.id,
                    toUserId: creditor.id,
                    amountCents: dueCents,
                  })
                }
              >
                Marquer comme réglé
              </Button>
              <button
                type="button"
                onClick={copyAmount}
                aria-label="Copier le montant"
                className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-on-ink-border text-white"
              >
                <CopyIcon size={20} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mini-cartes */}
      <div className="grid grid-cols-2 gap-3">
        <Card padding="sm" className="flex flex-col gap-1.5">
          <div className="text-[13px] font-semibold text-muted">Dépensé en commun</div>
          <div className="text-[22px] font-extrabold tracking-[-0.03em]">
            {formatMoney(balance?.totalCents ?? 0)}
          </div>
          <div className="text-[12px] text-muted">
            {expenses.length} {expenses.length > 1 ? 'dépenses' : 'dépense'}
          </div>
        </Card>

        <Card padding="sm" className="flex flex-col gap-2.5">
          <div className="text-[13px] font-semibold text-muted">Répartition</div>
          <SplitBar percentSelf={percentSelf} height={8} />
          <div className="flex justify-between text-[13px] font-bold">
            <span className="text-clement-text">
              {user.name.charAt(0).toUpperCase()} {percentSelf} %
            </span>
            <span className="text-laetitia-text">
              {partner.name.charAt(0).toUpperCase()} {100 - percentSelf} %
            </span>
          </div>
        </Card>
      </div>

      {/* Qui a payé quoi */}
      <Card className="flex flex-col gap-[18px]">
        <div className="flex items-baseline justify-between">
          <div className="text-[16px] font-bold">Qui a payé quoi</div>
          <div className="text-[12px] text-muted">payé / part due</div>
        </div>
        {shareRow(self, user, true)}
        {shareRow(other, partner, false)}
      </Card>

      {/* Dernières dépenses */}
      <div className="flex flex-col gap-2">
        <div className="flex h-11 items-center justify-between">
          <div className="text-[16px] font-bold">Dernières dépenses</div>
          <Link to="/expenses" className="py-3 text-[14px] font-semibold text-clement-text">
            Tout voir
          </Link>
        </div>

        {recentExpenses.length === 0 ? (
          <Card className="text-center text-[14px] text-muted">Aucune dépense ce mois-ci</Card>
        ) : (
          <Card padding="none" className="px-4 py-1">
            {recentExpenses.map((expense, index) => (
              <Link
                key={expense.id}
                to={isClosed ? '/expenses' : `/expenses/${expense.id}/edit`}
                className={`flex items-center gap-3 py-3 ${
                  index < recentExpenses.length - 1 ? 'border-b border-track' : ''
                }`}
              >
                <CategoryTile category={expense.category} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{expense.title}</span>
                  <span className="text-[12px] text-muted">
                    {formatDayShort(expense.spentAt)} · {expense.paidBy.displayName}
                  </span>
                </div>
                <span className="shrink-0 whitespace-nowrap text-[15px] font-bold">
                  {formatMoney(expense.amountCents)}
                </span>
              </Link>
            ))}
          </Card>
        )}
      </div>

      {/* Clôture — hors maquette, gardée pour ne pas perdre la fonctionnalité */}
      {!isClosed && expenses.length > 0 && (
        <Button variant="secondary" onClick={() => setShowCloseModal(true)}>
          Clôturer {formatMonth(year, month).toLowerCase()}
        </Button>
      )}

      <ConfirmModal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        onConfirm={() => closeMutation.mutate()}
        isLoading={closeMutation.isPending}
        title="Clôturer le mois"
        message={`Voulez-vous clôturer ${formatMonth(year, month).toLowerCase()} ? Les dépenses ne pourront plus être modifiées.`}
        confirmLabel="Clôturer"
      />
    </div>
  )
}
