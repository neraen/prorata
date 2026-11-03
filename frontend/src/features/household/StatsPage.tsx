import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, MonthSelector } from '../../components/ui'
import { expensesApi } from '../../lib/api'
import { useCoupleStore, useMonthStore } from '../../lib/stores'
import { CATEGORY_LABELS, formatMoney } from '../../lib/utils'
import { HouseholdStatus } from './MealsPage'

export function StatsPage() {
  const couple = useCoupleStore((s) => s.couple)
  const { year, month } = useMonthStore()
  const query = useQuery({ queryKey: ['expenses', year, month], queryFn: () => expensesApi.list(year, month), enabled: !!couple })
  const expenses = query.data?.items ?? []
  const total = expenses.reduce((sum, item) => sum + item.amountCents, 0)
  const groups = Object.entries(expenses.reduce<Record<string, number>>((all, item) => { all[item.category] = (all[item.category] ?? 0) + item.amountCents; return all }, {})).sort((a, b) => b[1] - a[1])
  return <div className="flex flex-col gap-5"><header><p className="mb-1 text-xs font-bold uppercase tracking-widest text-positive">Un peu de recul</p><h1 className="text-[30px] font-extrabold tracking-tight">Nos statistiques</h1><p className="mt-1 text-sm text-muted">Comprendre où va notre budget commun.</p></header><MonthSelector /><HouseholdStatus loading={query.isPending} error={query.isError} retry={() => void query.refetch()} />{query.data && <><Card className="bg-pastel-blue!"><p className="text-sm text-muted">Dépensé à deux ce mois-ci</p><p className="my-3 text-4xl font-extrabold">{formatMoney(total)}</p><p className="text-xs text-muted">{expenses.length} dépense{expenses.length > 1 ? 's' : ''} enregistrée{expenses.length > 1 ? 's' : ''}</p></Card><div className="flex items-center justify-between gap-3"><h2 className="text-base font-bold">Par catégorie</h2><Link to="/expenses" className="flex min-h-11 items-center text-sm font-bold text-positive">Voir les dépenses →</Link></div>{!groups.length && <Card className="grid gap-3 text-sm"><p className="text-muted">Ton bilan se construit avec les dépenses enregistrées. Ajoute le premier achat pour commencer.</p><Link to="/expenses/new" className="action-link">Noter une dépense</Link></Card>}{groups.map(([category, amount]) => <Card key={category} padding="sm"><div className="mb-3 flex justify-between gap-2 text-sm font-bold"><span>{CATEGORY_LABELS[category] ?? category}</span><span>{formatMoney(amount)}</span></div><div className="flex items-center gap-3"><progress className="h-2 w-full accent-positive" aria-label={CATEGORY_LABELS[category] ?? category} max={Math.max(total, 1)} value={amount} /><span className="w-12 text-right text-xs text-muted">{total ? Math.round(amount / total * 100) : 0} %</span></div></Card>)}<p className="text-xs leading-relaxed text-muted">Les catégories correspondent aux dépenses enregistrées. Le détail légumes, viande ou autres produits nécessitera la ventilation des tickets de courses.</p></>}</div>
}
