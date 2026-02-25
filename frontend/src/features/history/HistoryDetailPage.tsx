import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore, useCoupleStore } from '../../lib/stores'
import { monthsApi } from '../../lib/api'
import { formatMonth } from '../../lib/utils'
import { Card, Badge, Money, Button } from '../../components/ui'

export function HistoryDetailPage() {
  const { year, month } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { couple, partner } = useCoupleStore()

  const { data: balance, isLoading } = useQuery({
    queryKey: ['month-detail', Number(year), Number(month)],
    queryFn: () => monthsApi.detail(Number(year), Number(month)),
    enabled: !!couple && !!year && !!month,
  })

  if (!couple || !user || !partner) return null
  if (isLoading) return <p>Chargement...</p>
  if (!balance) return <p>Mois non trouvé</p>

  // Find current user and partner in balance
  const memberA = balance.members.find(m => m.userId === user.id)
  const memberB = balance.members.find(m => m.userId === partner.id)

  const percentA = memberA ? Math.round(memberA.weight * 100) : 50
  const percentB = 100 - percentA

  const getSettlementMessage = () => {
    if (!balance.settlement || balance.settlement.amountCents === 0) {
      return 'Équilibre parfait'
    }
    const fromUser = balance.settlement.fromUserId === user.id ? user : partner
    const toUser = balance.settlement.toUserId === user.id ? user : partner
    const amount = Math.round(balance.settlement.amountCents / 100)
    return `${fromUser.name} devait ${amount} € à ${toUser.name}`
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
        ← Retour
      </Button>

      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-text capitalize">
          {formatMonth(balance.year, balance.month)}
        </h1>
        <Badge variant="closed">Clôturé</Badge>
      </div>

      {/* Total */}
      <Card>
        <p className="text-text-muted text-sm mb-1">Total du mois</p>
        <p className="text-3xl font-bold text-text">
          <Money cents={balance.totalCents} />
        </p>
      </Card>

      {/* Solde */}
      <Card className="bg-accent/5 border-accent/20">
        <p className="text-text-muted text-sm mb-2">Solde de régularisation</p>
        <p className="text-xl font-bold text-accent">{getSettlementMessage()}</p>
      </Card>

      {/* Répartition */}
      <Card>
        <p className="text-text-muted text-sm mb-3">Répartition</p>
        <div className="flex rounded-full overflow-hidden h-4 mb-3">
          <div className="bg-secondary" style={{ width: `${percentA}%` }} />
          <div className="bg-accent" style={{ width: `${percentB}%` }} />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">{user.name} {percentA}%</span>
          <span className="text-text-muted">{partner.name} {percentB}%</span>
        </div>
      </Card>

      {/* Détail */}
      <Card>
        <p className="font-semibold text-text mb-4">Détail</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-text-muted text-sm">Part théorique {user.name}</p>
              <p className="font-semibold text-text">
                <Money cents={memberA?.targetCents ?? 0} />
              </p>
            </div>
            <div>
              <p className="text-text-muted text-sm">Part théorique {partner.name}</p>
              <p className="font-semibold text-text">
                <Money cents={memberB?.targetCents ?? 0} />
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-text-muted text-sm">Payé par {user.name}</p>
              <p className="font-semibold text-text">
                <Money cents={memberA?.paidCents ?? 0} />
              </p>
            </div>
            <div>
              <p className="text-text-muted text-sm">Payé par {partner.name}</p>
              <p className="font-semibold text-text">
                <Money cents={memberB?.paidCents ?? 0} />
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}