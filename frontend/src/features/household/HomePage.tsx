import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../../components/ui'
import { ArrowRightIcon, SlidersIcon } from '../../components/icons'
import { useAuthStore, useCoupleStore, useMonthStore } from '../../lib/stores'
import { monthsApi } from '../../lib/api'
import { formatMoney, formatMonth } from '../../lib/utils'
import { RecipeIllustration } from './RecipeIllustration'
import { useHousehold, weekDates } from './household'

export function HomePage() {
  const user = useAuthStore((s) => s.user)
  const couple = useCoupleStore((s) => s.couple)
  const { year, month } = useMonthStore()
  const { data } = useHousehold()
  const { data: balance, isError } = useQuery({ queryKey: ['balance', year, month], queryFn: () => monthsApi.balance(year, month), enabled: !!couple })
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const days = weekDates()
  const planned = Object.values(data?.meals ?? {}).filter((m) => days.includes(m.date)).length
  const remaining = data?.shopping.filter((i) => !i.checked).length
  return <div className="flex flex-col gap-5">
    <header className="flex items-start justify-between gap-3"><div><h1 className="text-[28px] font-extrabold tracking-tight">Bonjour {user?.name}</h1><p className="mt-1 text-sm text-muted">On prépare quoi aujourd’hui ?</p></div><Link to="/settings" aria-label="Réglages" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-surface"><SlidersIcon size={20} /></Link></header>
    <Link to="/meals"><Card className="border-0 bg-surface!"><div className="mb-5 flex items-center justify-between"><span className="text-lg font-extrabold">Aujourd’hui au menu</span></div>{(['lunch', 'dinner'] as const).map((slot) => {
      const meal = data?.meals[`${today}-${slot}`]
      const recipe = data?.recipes.find((r) => r.id === meal?.recipeId)
      return <div className="mb-3 flex items-center gap-3" key={slot}><RecipeIllustration recipe={recipe} showLabel={false} eager className="h-20 w-20 shrink-0 rounded-2xl" /><span><span className="mb-1 block text-xs text-muted">{slot === 'lunch' ? 'Midi' : 'Soir'}</span><span className="block text-sm font-bold">{recipe?.title ?? (data ? 'Choisir un plat' : 'Chargement…')}</span>{recipe && <span className="mt-1 block text-xs text-muted">{recipe.minutes} min</span>}</span></div>
    })}<div className="mt-5 flex items-center justify-between border-t border-positive/15 pt-4 text-sm font-bold text-positive">Organiser nos repas <ArrowRightIcon size={18} /></div></Card></Link>
    <div className="grid grid-cols-2 gap-3"><Link to="/meals"><Card className="h-full" padding="sm"><p className="text-3xl font-extrabold">{data ? planned : '—'}</p><p className="mt-2 text-sm font-bold">Repas prévus</p><p className="mt-1 text-xs text-muted">Cette semaine</p></Card></Link><Link to="/shopping"><Card className="h-full" padding="sm"><p className="text-3xl font-extrabold">{remaining ?? '—'}</p><p className="mt-2 text-sm font-bold">Articles à prendre</p><p className="mt-1 text-xs text-muted">Notre liste de courses</p></Card></Link></div>
    <Link to="/budget"><Card className="border-0 bg-ink! text-white"><p className="text-xs font-semibold uppercase tracking-widest text-on-ink-muted">Notre budget · {formatMonth(year, month)}</p><p className="my-3 text-3xl font-extrabold">{balance ? formatMoney(balance.totalCents) : '—'}</p><div className="flex items-center justify-between text-sm"><span className="text-on-ink-muted">{isError ? 'Budget indisponible pour le moment' : 'Dépenses communes et prorata'}</span><ArrowRightIcon size={20} /></div></Card></Link>
    <Link to="/stats" className="flex min-h-12 items-center justify-between px-1 text-sm font-semibold">Comprendre nos dépenses <ArrowRightIcon size={18} /></Link>
  </div>
}
