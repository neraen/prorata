import { AccountLink } from '../../components/AccountLink'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ActionLink, Card, Button } from '../../components/ui'
import { ArrowRightIcon, PlusIcon, PackageIcon, MealIcon, CartIcon } from '../../components/icons'
import { useAuthStore, useCoupleStore, useMonthStore } from '../../lib/stores'
import { monthsApi } from '../../lib/api'
import { formatMoney, formatMonth } from '../../lib/utils'
import { RecipeIllustration } from './RecipeIllustration'
import { HouseholdStatus } from './MealsPage'
import { dateKey } from './assistant'
import { useHousehold, weekDates } from './household'

export function HomePage() {
  const user = useAuthStore((s) => s.user)
  const couple = useCoupleStore((s) => s.couple)
  const { year, month, setMonth } = useMonthStore()
  const household = useHousehold()
  const { data } = household
  const balance = useQuery({ queryKey: ['balance', year, month], queryFn: () => monthsApi.balance(year, month), enabled: !!couple })
  const now = new Date()
  const today = dateKey(now)
  const todayLabel = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const days = weekDates()
  const planned = Object.values(data?.meals ?? {}).filter((meal) => days.includes(meal.date)).length
  const remaining = data?.shopping.filter((item) => !item.checked).length ?? 0
  const dinner = data?.meals[`${today}-dinner`]
  const soon = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3))
  const datesToCheck = data?.foodProfile?.pantry.filter((item) => item.expiresOn && item.expiresOn <= soon).length ?? 0
  const next = !dinner
    ? { title: 'Et si on décidait du dîner ?', description: 'Choisis un plat pour ce soir. Le reste peut attendre.', label: 'Choisir le dîner', to: `/meals?date=${today}&slot=dinner`, Icon: MealIcon }
    : remaining > 0
      ? { title: 'La liste est prête à vous suivre.', description: `${remaining} article${remaining > 1 ? 's' : ''} à prendre dans votre liste partagée.`, label: 'Ouvrir les courses', to: '/shopping', Icon: CartIcon }
      : { title: 'Une petite avance pour la semaine.', description: 'Vos repas d’aujourd’hui sont prévus. Préparez la suite à votre rythme.', label: 'Préparer les prochains repas', to: '/meals/assistant', Icon: MealIcon }
  function currentMonth() { setMonth(now.getFullYear(), now.getMonth() + 1) }
  return <div className="grid gap-6">
    <header className="flex items-center justify-between gap-3"><div><p className="mb-2 text-xs font-semibold capitalize tracking-wide text-muted">{todayLabel}</p><h1 className="text-[29px] font-extrabold tracking-[-0.04em]">Bonjour {user?.name}</h1></div><AccountLink /></header>
    <HouseholdStatus loading={household.isPending} error={household.isError && !data} retry={() => void household.refetch()} />
    {data && <>
      <Card className="premium-hero grid gap-4 border-white!" padding="lg"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]"><next.Icon size={17} /> Pour aujourd’hui</div><h2 className="max-w-xs text-[28px] font-extrabold leading-[1.16] tracking-[-0.035em]">{next.title}</h2><p className="max-w-xs text-sm leading-relaxed text-muted">{next.description}</p><ActionLink to={next.to}>{next.label}<ArrowRightIcon size={18} /></ActionLink></Card>
      <section aria-labelledby="today-menu"><div className="mb-3 flex items-center justify-between gap-3"><h2 id="today-menu" className="text-lg font-extrabold">À table aujourd’hui</h2><Link to="/meals" className="flex min-h-11 items-center gap-1 text-sm font-semibold text-positive">La semaine<ArrowRightIcon size={15} /></Link></div><Card padding="none" className="divide-y divide-border px-4">{(['lunch', 'dinner'] as const).map((slot) => {
        const meal = data.meals[`${today}-${slot}`]
        const recipe = data.recipes.find((entry) => entry.id === meal?.recipeId)
        return <Link key={slot} to={recipe ? `/meals?view=${encodeURIComponent(recipe.id)}` : `/meals?date=${today}&slot=${slot}`} className="flex min-h-24 items-center gap-3 py-3"><RecipeIllustration recipe={recipe} showLabel={false} eager className="h-16 w-16 shrink-0 rounded-2xl" /><span className="min-w-0 flex-1"><span className="mb-1 block text-xs text-muted">{slot === 'lunch' ? 'Ce midi' : 'Ce soir'}</span><span className="block text-sm font-bold">{recipe?.title ?? 'Choisir un plat'}</span><span className="mt-1 block text-xs text-positive">{recipe ? `${recipe.minutes} min · Voir la recette` : 'Un choix, et c’est prévu'}</span></span><ArrowRightIcon size={16} /></Link>
      })}</Card></section>
    </>}
    <section aria-label="Actions rapides" className="grid grid-cols-2 gap-3"><Link to="/expenses/new" onClick={currentMonth} className="flex min-h-28 flex-col justify-between gap-4 rounded-[24px] border border-white bg-pastel-peach p-4 shadow-card"><PlusIcon size={22} /><span className="text-sm font-extrabold leading-snug">Noter une dépense</span></Link><Link to="/meals/stock?add=1" className="flex min-h-28 flex-col justify-between gap-4 rounded-[24px] border border-white bg-pastel-lilac p-4 shadow-card"><PackageIcon size={22} /><span className="text-sm font-extrabold leading-snug">Ajouter au stock</span></Link></section>
    {datesToCheck > 0 && <Link to="/meals/stock" className="flex min-h-16 items-center justify-between gap-3 rounded-[20px] border border-white bg-pastel-peach px-4 py-3 text-sm"><span><strong>{datesToCheck} date{datesToCheck > 1 ? 's' : ''} à vérifier</strong><span className="mt-1 block text-xs text-muted">Dates passées ou dans les trois prochains jours, selon votre stock déclaré.</span></span><ArrowRightIcon className="shrink-0" size={18} /></Link>}
    {data && <div className="grid grid-cols-2 gap-3"><Link to="/meals"><Card padding="sm" className="h-full"><p className="text-2xl font-extrabold">{planned}</p><p className="mt-1 text-sm font-semibold">repas cette semaine</p></Card></Link><Link to="/shopping"><Card padding="sm" className="h-full"><p className="text-2xl font-extrabold">{remaining}</p><p className="mt-1 text-sm font-semibold">articles à prendre</p></Card></Link></div>}
    <Card className="grid gap-3 bg-pastel-lilac!"><Link to="/budget"><p className="text-xs font-semibold text-muted">Notre budget · {formatMonth(year, month)}</p><p className="my-2 text-[28px] font-extrabold">{balance.data ? formatMoney(balance.data.totalCents) : '—'}</p><span className="flex min-h-11 items-center justify-between text-sm font-bold">Voir nos dépenses<ArrowRightIcon size={18} /></span></Link>{balance.isError && <Button variant="secondary" onClick={() => void balance.refetch()}>Réessayer le budget</Button>}</Card>
  </div>
}
