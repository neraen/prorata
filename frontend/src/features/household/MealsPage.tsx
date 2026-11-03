import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card } from '../../components/ui'
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, PlusIcon } from '../../components/icons'
import { useAuthStore, useToastStore } from '../../lib/stores'
import { displayDate, quantityLabel, useHousehold, weekDates, type Recipe, type Meal } from './household'
import { MEAL_CATEGORIES } from './assistant'
import { RecipeCategoryEditor } from './RecipeCategoryEditor'
import { RecipeIllustration } from './RecipeIllustration'
import { recipeVisual } from './recipeVisual'
import { RecipeForm, fieldClass } from './RecipeForm'

export function HouseholdDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    function fit() {
      const viewport = window.visualViewport
      if (!dialog || !viewport) return
      dialog.style.maxHeight = `${viewport.height - 24}px`
      // Avoid centering a dialog behind an iOS keyboard (layout viewport stays tall).
      if (viewport.height < window.innerHeight - 100) {
        dialog.style.top = `${viewport.offsetTop + 12}px`
        dialog.style.bottom = 'auto'
        dialog.style.marginTop = '0'
      } else {
        dialog.style.top = ''; dialog.style.bottom = ''; dialog.style.marginTop = ''
      }
    }
    fit()
    window.visualViewport?.addEventListener('resize', fit)
    window.visualViewport?.addEventListener('scroll', fit)
    return () => { window.visualViewport?.removeEventListener('resize', fit); window.visualViewport?.removeEventListener('scroll', fit) }
  }, [])
  return <dialog ref={ref} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose() }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-24px)] max-w-[456px] overflow-y-auto rounded-[24px] bg-surface p-5 text-ink backdrop:bg-ink/40">
    <div className="mb-5 flex items-center justify-between gap-2"><h2 className="text-xl font-extrabold">{title}</h2><button autoFocus type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bg" aria-label="Fermer"><CloseIcon size={20} /></button></div>
    {children}
  </dialog>
}
export function HouseholdStatus({ loading, error, retry }: { loading: boolean; error: boolean; retry: () => void }) {
  if (loading) return <p role="status" className="py-8 text-center text-muted">Chargement de votre espace…</p>
  if (error) return <Card className="flex flex-col gap-3"><p role="alert" className="text-sm text-negative">Impossible de charger votre espace. Vérifie ta connexion.</p><Button variant="secondary" onClick={retry}>Réessayer</Button></Card>
  return null
}
export function MealsPage() {
  const household = useHousehold()
  const { data, send } = household
  const userId = useAuthStore((s) => s.user?.id)
  const showToast = useToastStore((s) => s.show)
  const navigate = useNavigate()
  const [tab, setTab] = useState<'week' | 'recipes'>('week')
  const [searchParams] = useSearchParams()
  const [offset, setOffset] = useState(() => {
    const requested = searchParams.get('week')
    if (!requested || !/^\d{4}-\d{2}-\d{2}$/.test(requested)) return 0
    const day = new Date(`${requested}T12:00:00`); day.setDate(day.getDate() - (day.getDay() + 6) % 7)
    return Math.round((Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) - Date.parse(`${weekDates()[0]}T00:00:00Z`)) / 604800000)
  })
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [source, setSource] = useState('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Recipe | 'new' | null>(null)
  const [recipeToPlan, setRecipeToPlan] = useState<Recipe | null>(null)
  const [viewing, setViewing] = useState<Recipe | null>(null)
  const [slot, setSlot] = useState<{ date: string; slot: Meal['slot'] } | null>(null)
  const [selected, setSelected] = useState('')
  const [portions, setPortions] = useState(2)
  const [busy, setBusy] = useState(false)
  const days = weekDates(offset)
  const recipes = data?.recipes ?? []
  const selectedRecipe = recipes.find((recipe) => recipe.id === selected)
  const filtered = recipes.filter((r) => (categoryFilter === 'all' || r.category === categoryFilter) && r.title.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')) && (source === 'all' || (source === 'app' ? r.source === 'app' : r.authorId === userId)))
  const count = Object.values(data?.meals ?? {}).filter((m) => days.includes(m.date)).length
  async function saveMeal(remove = false) {
    if (!slot) return
    setBusy(true)
    try { await send('meal.set', { ...slot, recipeId: remove ? null : selected, servings: portions }); setSlot(null); setRecipeToPlan(null) }
    catch { /* Error is shown by the shared command handler. */ }
    finally { setBusy(false) }
  }
  async function generate() {
    setBusy(true)
    try { await send('shopping.generate', { week: days[0] }); showToast('Liste de courses mise à jour', 'success'); navigate('/shopping') }
    catch { /* Error is shown by the shared command handler. */ }
    finally { setBusy(false) }
  }
  return <div className="flex flex-col gap-5">
    <header><h1 className="text-[30px] font-extrabold tracking-tight">{tab === 'recipes' ? 'Nos recettes' : 'Nos repas'}</h1><p className="mt-1 text-sm text-muted">{tab === 'recipes' ? 'À chaque envie, son petit plat.' : 'Une semaine à partager.'}</p></header>
    {tab === 'week' && <><Link to={`/meals/assistant?week=${weekDates(offset)[0]}`} className="flex min-h-28 items-center justify-between overflow-hidden rounded-[22px] bg-[#EBF0E6] pl-5 text-ink"><span className="py-4"><span className="mb-1 block text-xs font-semibold text-positive">Quelques minutes pour s’organiser</span><span className="block text-lg font-extrabold">Organiser notre semaine</span><span className="mt-2 block text-sm font-semibold text-positive">C’est parti →</span></span><img src="/illustrations/recipe-quick.webp" alt="" aria-hidden="true" width={112} height={112} className="h-28 w-28 shrink-0 object-contain mix-blend-multiply" /></Link>
    <Link to="/meals/stock" className="flex min-h-12 items-center justify-between px-1 text-sm"><span className="font-bold">Notre stock <span className="ml-1 font-normal text-muted">{data?.foodProfile?.pantry.length ?? 0} aliments</span></span><span className="font-semibold text-positive">Voir →</span></Link></>}
    <div className="grid grid-cols-2 gap-1 rounded-[16px] bg-segment-bg p-1">{([['week', 'Ma semaine'], ['recipes', 'Les recettes']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)} className={`h-11 rounded-[12px] text-sm font-bold ${tab === value ? 'bg-surface shadow-segment' : 'text-muted'}`}>{label}</button>)}</div>
    <HouseholdStatus loading={household.isPending} error={household.isError && !data} retry={() => void household.refetch()} />
    {data && (tab === 'week' ? <>
      <Card className="flex flex-col gap-4 border-0 bg-positive-bg!">
        <div className="flex items-center justify-between gap-1"><button type="button" aria-label="Semaine précédente" className="flex h-11 w-11 shrink-0 items-center justify-center" onClick={() => setOffset((v) => v - 1)}><ChevronLeftIcon size={20} /></button><div className="text-center"><p className="text-sm font-bold">{displayDate(days[0], { day: 'numeric', month: 'short' })} – {displayDate(days[6], { day: 'numeric', month: 'short' })}</p><p className="mt-1 text-xs text-muted">{count} repas planifié{count > 1 ? 's' : ''}</p></div><button type="button" aria-label="Semaine suivante" className="flex h-11 w-11 shrink-0 items-center justify-center" onClick={() => setOffset((v) => v + 1)}><ChevronRightIcon size={20} /></button></div>
        {offset !== 0 && <button type="button" onClick={() => setOffset(0)} className="min-h-11 text-sm font-bold text-positive underline">Revenir à cette semaine</button>}{!count && <p className="text-sm leading-relaxed text-muted">Pour commencer, touche « Choisir un plat » sur un jour, ou demande des idées à l’assistant. Tu pourras ensuite créer la liste de courses.</p>}<Button onClick={generate} disabled={!count} isLoading={busy}>Préparer les courses</Button>
        <p className="text-xs leading-relaxed text-muted">Crée la liste d’ingrédients pour les repas de cette semaine. Vérifie ensuite ce que tu as déjà à la maison.</p>
      </Card>
      {recipeToPlan && <Card className="grid gap-2 bg-positive-bg!"><p className="text-sm">Choisis un midi ou un soir ci-dessous pour planifier <strong>{recipeToPlan.title}</strong>.</p><button type="button" onClick={() => setRecipeToPlan(null)} className="min-h-11 text-left text-sm font-bold underline">Annuler ce choix</button></Card>}
      {days.map((date) => <div key={date} className="flex flex-col gap-2"><h2 className="px-1 text-sm font-bold capitalize">{displayDate(date)}</h2><Card padding="none" className="divide-y divide-border px-4">{(['lunch', 'dinner'] as const).map((mealSlot) => {
        const meal = data.meals[`${date}-${mealSlot}`]
        const recipe = recipes.find((r) => r.id === meal?.recipeId)
        const category = meal?.category ?? recipe?.category
        return <button key={mealSlot} type="button" onClick={() => { setSlot({ date, slot: mealSlot }); setSelected(recipeToPlan?.id ?? meal?.recipeId ?? recipes[0]?.id ?? ''); setPortions(recipeToPlan ? (data.foodProfile?.servings ?? recipeToPlan.servings) : (meal?.servings ?? 2)) }} className="flex min-h-[76px] w-full items-center gap-3 py-3 text-left"><span className="w-10 shrink-0 text-xs text-muted">{mealSlot === 'lunch' ? 'Midi' : 'Soir'}</span>{recipe && <RecipeIllustration recipe={recipe} showLabel={false} className="h-14 w-14 shrink-0 rounded-xl" />}<span className="min-w-0 flex-1"><span className={`block text-sm ${recipe ? 'font-bold' : 'text-muted'}`}>{recipe?.title ?? 'Choisir un plat'}</span>{meal && <span className="text-xs text-muted">{meal.servings} portions · {recipe?.minutes} min{category ? ` · ${MEAL_CATEGORIES[category]}` : ''}</span>}</span>{recipe ? <ChevronRightIcon size={18} /> : <PlusIcon size={18} />}</button>
      })}</Card></div>)}
    </> : <>
      <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-extrabold">À cuisiner</h2><Button variant="secondary" className="h-11! text-sm!" onClick={() => setEditing('new')}><PlusIcon size={16} /> Ma recette</Button></div>
      <label className="grid gap-1"><span className="sr-only">Rechercher une recette</span><input type="search" className={fieldClass} placeholder="Rechercher un plat…" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Types de repas">{[['all', 'Tous'], ...Object.entries(MEAL_CATEGORIES)].map(([value, label]) => <button type="button" key={value} onClick={() => setCategoryFilter(value)} aria-pressed={categoryFilter === value} className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${categoryFilter === value ? 'bg-ink text-white' : 'border bg-surface text-muted'}`}>{label}</button>)}</div>
      <details><summary className="min-h-11 cursor-pointer py-2 text-sm text-muted">Choisir l’origine des recettes</summary><div className="mt-2 flex flex-wrap gap-2">{[['all', 'Toutes'], ['mine', 'Mes recettes'], ['app', 'Les idées de l’app']].map(([value, label]) => <button type="button" key={value} onClick={() => setSource(value)} aria-pressed={source === value} className={`min-h-11 rounded-full border px-3 text-sm font-semibold ${source === value ? 'bg-ink text-white' : 'bg-surface'}`}>{label}</button>)}</div></details>
      <p role="status" className="text-sm text-muted">{filtered.length} recette{filtered.length > 1 ? 's' : ''}{source !== 'all' ? ' · Filtre d’origine actif' : ''}</p>
      {filtered.length === 0 && <Card className="grid gap-3 text-sm text-muted"><p>Aucun plat ne correspond à ces choix.</p><Button variant="secondary" onClick={() => { setSearch(''); setCategoryFilter('all'); setSource('all') }}>Voir toutes les recettes</Button></Card>}
      <div className="grid grid-cols-2 gap-3">{filtered.map((recipe) => <button type="button" key={recipe.id} onClick={() => setViewing(recipe)} className="overflow-hidden rounded-[20px] border bg-surface text-left transition-shadow hover:shadow-md"><RecipeIllustration recipe={recipe} className="aspect-[4/3] w-full" /><span className="grid gap-2 p-3"><span className="text-xs font-semibold text-positive">{recipe.category ? MEAL_CATEGORIES[recipe.category] : 'À classer'}</span><span className="min-h-11 text-sm font-extrabold leading-snug">{recipe.title}</span><span className="text-xs text-muted">{recipe.minutes} min · {recipe.servings} personnes</span>{recipe.source !== 'app' && <span className="text-xs text-muted">{recipe.authorId === userId ? 'Ma recette' : 'Recette partagée'}</span>}</span></button>)}</div>
      <p className="text-xs leading-relaxed text-muted">Le carnet signale une recette personnelle. L’assiette vide signale une recette sans image. Ces visuels génériques ne représentent pas les plats.</p>
    </>)}
    {editing && <HouseholdDialog title={editing === 'new' ? 'Créer une recette' : 'Modifier la recette'} onClose={() => setEditing(null)}><RecipeForm recipe={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSave={(payload) => send('recipe.save', payload)} /></HouseholdDialog>}
    {viewing && <HouseholdDialog title={viewing.title} onClose={() => setViewing(null)}><RecipeIllustration recipe={viewing} eager className="mb-2 h-48 w-full rounded-2xl" />{recipeVisual(viewing).generic && <p className="mb-4 text-center text-xs text-muted">{recipeVisual(viewing).label} : ne représente pas le plat.</p>}<p className="mb-4 text-sm text-muted">{viewing.minutes} min · Pour {viewing.servings} personnes</p><p className="mb-4 text-xs font-semibold text-positive">{viewing.category ? MEAL_CATEGORIES[viewing.category] : 'À classer'}{viewing.categorySource === 'ai' ? ' · Suggestion IA, modifiable' : ''}</p><details className="mb-4 rounded-xl border px-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Modifier le type de ce plat</summary><RecipeCategoryEditor recipe={viewing} onSave={async (payload) => { await send('recipe.category', payload); setViewing(null) }} /></details><h3 className="mb-2 font-bold">Ingrédients</h3><ul className="mb-5 divide-y divide-border">{viewing.ingredients.map((i, index) => <li className="flex justify-between gap-3 py-2 text-sm" key={index}><span>{i.name}</span><span className="shrink-0 font-semibold">{quantityLabel(i)}</span></li>)}</ul><h3 className="mb-2 font-bold">Préparation</h3><p className="mb-5 whitespace-pre-wrap text-sm leading-relaxed text-muted">{viewing.instructions}</p><Button className="w-full" onClick={() => { setRecipeToPlan(viewing); setViewing(null); setTab('week'); requestAnimationFrame(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.getElementById('main-content')?.focus({ preventScroll: true }) }) }}>Planifier dans la semaine</Button>{viewing.authorId === userId && <Button variant="secondary" className="mt-2 w-full" onClick={() => { setEditing(viewing); setViewing(null) }}>Modifier ma recette</Button>}</HouseholdDialog>}
    {slot && <HouseholdDialog title={`${displayDate(slot.date)} · ${slot.slot === 'lunch' ? 'Déjeuner' : 'Dîner'}`} onClose={() => setSlot(null)}><div className="flex flex-col gap-4">{recipeToPlan && data?.meals[`${slot.date}-${slot.slot}`] && <p className="rounded-xl bg-positive-bg p-3 text-sm">Ce repas est déjà prévu. Enregistrer remplacera le plat actuel par ta sélection.</p>}{recipes.length ? <><label className="grid gap-2 text-sm font-semibold">Le plat<select className={fieldClass} value={selected} onChange={(e) => setSelected(e.target.value)}>{recipes.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select></label>{selectedRecipe && <figure aria-label={`${recipeVisual(selectedRecipe).generic ? 'Visuel générique pour' : 'Illustration de'} ${selectedRecipe.title}`} className="overflow-hidden rounded-[20px] bg-bg"><RecipeIllustration recipe={selectedRecipe} eager showLabel={false} className="h-[min(32dvh,260px)] min-h-40 w-full" /><figcaption className="px-4 pb-3 text-center text-sm text-muted">{selectedRecipe.minutes} min{selectedRecipe.category ? ` · ${MEAL_CATEGORIES[selectedRecipe.category]}` : ''}<span className="mt-1 block text-xs">{recipeVisual(selectedRecipe).generic ? `${recipeVisual(selectedRecipe).label} : ne représente pas le plat` : 'Illustration du plat'}</span></figcaption></figure>}<label className="grid gap-2 text-sm font-semibold">Nombre de portions<input className={fieldClass} type="number" min={1} max={20} step={1} value={portions} onChange={(e) => setPortions(Number(e.target.value))} /></label><Button disabled={!selectedRecipe || !Number.isInteger(portions) || portions < 1 || portions > 20} isLoading={busy} onClick={() => void saveMeal()}>Enregistrer ce repas</Button></> : <><p className="text-sm text-muted">Commence par enregistrer une recette.</p><Button onClick={() => { setSlot(null); setEditing('new') }}>Créer une recette</Button></>}{data?.meals[`${slot.date}-${slot.slot}`] && <Button variant="danger" disabled={busy} onClick={() => void saveMeal(true)}>Retirer ce repas</Button>}</div></HouseholdDialog>}
  </div>
}
