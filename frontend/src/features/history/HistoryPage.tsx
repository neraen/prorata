import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useCoupleStore } from '../../lib/stores'
import { monthsApi } from '../../lib/api'
import { formatMonth, formatMoneyShort } from '../../lib/utils'
import { Card, Badge, EmptyState } from '../../components/ui'

export function HistoryPage() {
  const { couple } = useCoupleStore()

  const { data: historyList } = useQuery({
    queryKey: ['history'],
    queryFn: () => monthsApi.history(),
    enabled: !!couple,
  })

  if (!couple) return null

  const closures = historyList?.items ?? []

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text">Historique</h1>

      {closures.length === 0 ? (
        <EmptyState
          icon="📅"
          title="Aucun mois clôturé"
          description="Les mois clôturés apparaîtront ici"
        />
      ) : (
        <div className="space-y-3">
          {closures.map((closure) => (
            <Link key={`${closure.year}-${closure.month}`} to={`/history/${closure.year}/${closure.month}`}>
              <Card className="flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <p className="font-semibold text-text capitalize">
                    {formatMonth(closure.year, closure.month)}
                  </p>
                  <p className="text-sm text-text-muted">
                    Total: {formatMoneyShort(closure.totalCents)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="closed">Clôturé</Badge>
                  {closure.settlement && closure.settlement.amountCents > 0 && (
                    <p className="text-sm text-accent mt-1">
                      {formatMoneyShort(closure.settlement.amountCents)}
                    </p>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}