import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card } from '../../components/ui'
import { ChevronLeftIcon, PlusIcon } from '../../components/icons'
import { useAuthStore, useCoupleStore, useToastStore } from '../../lib/stores'
import { displayDate, useHousehold, weekDates, type Household, type Meal } from './household'
import { validPlanningDate } from './planningDates'
import { MealRecipePicker } from './MealRecipePicker'
import { HouseholdStatus } from './MealsPage'
import { fieldClass } from './RecipeForm'

type Part = 'main' | 'extra'
interface Draft { primary: string; primaryPortions: string; extra: string; extraPortions: string; hasExtra: boolean; active: Part }
function readDraft(key: string, base: string): Partial<Draft> {
  try { const value = JSON.parse(sessionStorage.getItem(key) ?? 'null'); return value?.base === base ? value : {} } catch { return {} }
}

export function MealChoicePage() {
  const household = useHousehold()
  const [params] = useSearchParams()
  const date = params.get('date')
  const slot = params.get('slot')
  const week = validPlanningDate(params.get('week')) ? params.get('week')! : weekDates(0, household.data?.planningStart)[0]
  if (!validPlanningDate(date) || !['lunch', 'dinner'].includes(slot ?? '')) return <main className="grid gap-4"><h1 className="text-xl font-bold">Quel repas souhaites-tu prévoir ?</h1><Link to={`/meals?week=${week}`} className="action-link">Retour au planning</Link></main>
  if (!household.data) return <main><HouseholdStatus loading={household.isPending} error={household.isError} retry={() => void household.refetch()} /><Link to={`/meals?week=${week}`} className="flex min-h-12 items-center text-sm font-bold">← Retour au planning</Link></main>
  return <MealChoiceForm key={`${date}-${slot}`} date={date} slot={slot as Meal['slot']} week={week} data={household.data} send={household.send} />
}

function MealChoiceForm({ date, slot, week, data, send }: { date: string; slot: Meal['slot']; week: string; data: Household; send: ReturnType<typeof useHousehold>['send'] }) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToastStore((state) => state.show)
  const coupleId = useCoupleStore((state) => state.couple?.id)
  const userId = useAuthStore((state) => state.user?.id)
  const storageKey = `prorata-meal-choice-${coupleId}-${userId}-${date}-${slot}`
  const existing = data.meals[`${date}-${slot}`]
  const [base] = useState(() => JSON.stringify(existing ?? null))
  const [initial] = useState(() => readDraft(storageKey, base))
  const picked = params.get('picked') ?? ''
  const pickedPart: Part = params.get('part') === 'extra' ? 'extra' : 'main'
  const prefill = params.get('recipe') ?? ''
  const [primary, setPrimary] = useState(() => picked && pickedPart === 'main' ? picked : prefill || (initial.primary ?? existing?.recipeId ?? ''))
  const [primaryPortions, setPrimaryPortions] = useState(initial.primaryPortions ?? String(existing?.servings ?? data.foodProfile?.servings ?? 2))
  const [extra, setExtra] = useState(() => picked && pickedPart === 'extra' ? picked : initial.extra ?? existing?.extra?.recipeId ?? '')
  const [extraPortions, setExtraPortions] = useState(initial.extraPortions ?? String(existing?.extra?.servings ?? data.foodProfile?.servings ?? 2))
  const [hasExtra, setHasExtra] = useState(picked && pickedPart === 'extra' ? true : initial.hasExtra ?? !!existing?.extra)
  const [active, setActive] = useState<Part>(picked ? pickedPart : prefill ? 'main' : initial.active ?? 'main')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const page = useRef<HTMLElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const back = `/meals?week=${week}`
  const chooser = `/meals/choose?date=${date}&slot=${slot}&week=${week}&part=${active}`
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    function fit() {
      const viewport = window.visualViewport
      if (page.current) { page.current.style.height = `${viewport?.height ?? window.innerHeight}px`; page.current.style.top = `${viewport?.offsetTop ?? 0}px` }
    }
    fit()
    window.visualViewport?.addEventListener('resize', fit)
    window.visualViewport?.addEventListener('scroll', fit)
    window.addEventListener('resize', fit)
    return () => { window.visualViewport?.removeEventListener('resize', fit); window.visualViewport?.removeEventListener('scroll', fit); window.removeEventListener('resize', fit) }
  }, [])
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ base, primary, primaryPortions, extra, extraPortions, hasExtra, active })) } catch { /* Current choices remain usable. */ }
  }, [storageKey, base, primary, primaryPortions, extra, extraPortions, hasExtra, active])
  useEffect(() => {
    if (params.has('picked')) setParams((previous) => { const next = new URLSearchParams(previous); next.delete('picked'); return next }, { replace: true })
  }, [params, setParams])
  const mainRecipe = data.recipes.find((recipe) => recipe.id === primary)
  const extraRecipe = data.recipes.find((recipe) => recipe.id === extra)
  const validPortions = (value: string) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 20
  const valid = !!mainRecipe && validPortions(primaryPortions) && (!hasExtra || (!!extraRecipe && extra !== primary && validPortions(extraPortions)))
  function leave() {
    try { sessionStorage.removeItem(storageKey) } catch { /* No stored draft. */ }
    navigate(back, { replace: true })
  }
  async function save(remove = false) {
    if (!remove && !valid) return
    setBusy(true); setError('')
    try {
      await send('meal.set', { date, slot, recipeId: remove ? null : primary, servings: Number(primaryPortions), extra: hasExtra && !remove ? { recipeId: extra, servings: Number(extraPortions) } : null })
      toast(remove ? 'Repas retiré du planning' : hasExtra ? 'Les deux plats sont ajoutés au repas' : 'Repas enregistré', 'success')
      leave()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossible d’enregistrer ce repas. Tes choix sont conservés.') }
    finally { setBusy(false) }
  }
  return <main ref={page} className="fixed inset-x-0 top-0 mx-auto flex h-dvh max-w-[480px] flex-col bg-surface px-5 pt-3 text-ink">
    <header className="mb-2 flex shrink-0 items-center gap-2"><button type="button" aria-label="Retour au planning sans enregistrer" disabled={busy} onClick={leave} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-bg"><ChevronLeftIcon size={22} /></button><div><p className="text-xs capitalize text-muted">{displayDate(date)} · {slot === 'lunch' ? 'Midi' : 'Soir'}</p><h1 ref={heading} tabIndex={-1} className="text-xl font-extrabold">Composer ce repas</h1></div></header>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
      <div className="mb-4 grid gap-3">
        <div className={`grid gap-2 ${hasExtra ? 'grid-cols-2' : ''}`} aria-label="Les plats du repas">
          <button type="button" disabled={busy} aria-pressed={active === 'main'} onClick={() => setActive('main')} className={`min-h-16 rounded-2xl border-2 p-3 text-left ${active === 'main' ? 'border-positive bg-pastel-sage' : 'border-border bg-bg'}`}><span className="block text-xs font-semibold text-muted">Plat principal</span><span className="mt-1 block text-sm font-bold">{mainRecipe?.title ?? 'Choisir un plat'}</span></button>
          {hasExtra && <button type="button" disabled={busy} aria-pressed={active === 'extra'} onClick={() => setActive('extra')} className={`min-h-16 rounded-2xl border-2 p-3 text-left ${active === 'extra' ? 'border-positive bg-pastel-sage' : 'border-border bg-bg'}`}><span className="block text-xs font-semibold text-muted">Entrée / 2e plat</span><span className="mt-1 block text-sm font-bold">{extraRecipe?.title ?? 'Choisir une recette'}</span></button>}
        </div>
        {!hasExtra ? <Button disabled={busy} variant="secondary" onClick={() => { setHasExtra(true); setActive('extra') }}><PlusIcon size={18} /> Ajouter une entrée ou un 2e plat</Button> : <button type="button" disabled={busy} onClick={() => { setHasExtra(false); setExtra(''); setActive('main') }} className="min-h-11 text-left text-xs font-semibold text-muted underline">Retirer le 2e plat de ma sélection</button>}
        <label className="grid gap-1 text-sm font-semibold">{active === 'main' ? 'Portions du plat principal' : 'Portions de l’entrée / du 2e plat'}<input className={fieldClass} type="number" inputMode="numeric" min={1} max={20} step={1} disabled={busy} value={active === 'main' ? primaryPortions : extraPortions} onChange={(event) => active === 'main' ? setPrimaryPortions(event.target.value) : setExtraPortions(event.target.value)} /></label>
        {prefill && existing && prefill !== existing.recipeId && <p className="rounded-xl bg-pastel-sage p-3 text-xs">Ce repas est déjà prévu. La sélection ne sera appliquée qu’en validant.</p>}
      </div>
      {data.recipes.length ? <MealRecipePicker key={active} pageLayout recipes={data.recipes} selected={active === 'main' ? primary : extra} unavailable={(active === 'main' ? hasExtra && extra : primary) ? [active === 'main' ? extra : primary] : []} onSelect={active === 'main' ? setPrimary : setExtra} disabled={busy} /> : <Card><p className="text-sm text-muted">Commence par créer une recette.</p></Card>}
      <Button className="mt-4 w-full" variant="secondary" disabled={busy} onClick={() => navigate(`/meals/recipes/new?returnTo=${encodeURIComponent(chooser)}`, { replace: true })}><PlusIcon size={18} /> Créer une recette</Button>
      {existing && <Button variant="danger" className="mt-3 w-full" disabled={busy} onClick={() => void save(true)}>Retirer tout le repas</Button>}
    </div>
    <footer className="shrink-0 border-t border-border bg-surface py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      {error && <p role="alert" className="mb-2 text-xs text-negative">{error}</p>}
      {!valid && <p role="status" className="mb-2 text-xs text-muted">{!mainRecipe ? 'Choisis ton plat principal.' : hasExtra && !extraRecipe ? 'Choisis le 2e plat ou retire-le de la sélection.' : hasExtra && extra === primary ? 'Choisis deux recettes différentes.' : 'Indique entre 1 et 20 portions pour chaque plat.'}</p>}
      <Button className="w-full" disabled={!valid} isLoading={busy} onClick={() => void save()}>{hasExtra ? 'Valider les deux plats' : 'Valider ce repas'}</Button>
    </footer>
  </main>
}
