import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card } from '../../components/ui'
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, PlusIcon } from '../../components/icons'
import { useAuthStore, useToastStore } from '../../lib/stores'
import { displayDate, quantityLabel, useHousehold, weekDates, type Recipe, type Meal } from './household'
import { MEAL_CATEGORIES } from './assistant'
import { RecipeCategoryEditor } from './RecipeCategoryEditor'
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
  const [source, setSource] = useState('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Recipe | 'new' | null>(null)
  const [viewing, setViewing] = useState<Recipe | null>(null)
  const [slot, setSlot] = useState<{ date: string; slot: Meal['slot'] } | null>(null)
  const [selected, setSelected] = useState('')
  const [portions, setPortions] = useState(2)
  const [busy, setBusy] = useState(false)
  const days = weekDates(offset)
  const recipes = data?.recipes ?? []
  const filtered = recipes.filter((r) => r.title.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')) && (source === 'all' || (source === 'app' ? r.source === 'app' : r.authorId === userId)))
  const count = Object.values(data?.meals ?? {}).filter((m) => days.includes(m.date)).length
  async function saveMeal(remove = false) {
    if (!slot) return
    setBusy(true)
    try { await send('meal.set', { ...slot, recipeId: remove ? null : selected, servings: portions }); setSlot(null) }
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
    <header><p className="mb-1 text-xs font-bold uppercase tracking-widest text-positive">À table, à deux</p><h1 className="text-[30px] font-extrabold tracking-tight">Nos repas</h1><p className="mt-1 text-sm text-muted">De l’idée à l’assiette, une semaine bien préparée.</p></header>
    <Link to={`/meals/assistant?week=${weekDates(offset)[0]}`} className="flex min-h-[60px] items-center justify-between gap-3 rounded-[18px] bg-positive-bg px-4 py-3 text-sm font-bold text-positive"><span>✦ Organiser notre semaine</span><span aria-hidden="true">→</span></Link>
    <Link to="/meals/stock" className="flex min-h-12 items-center justify-between rounded-[16px] border bg-surface px-4 text-sm font-bold"><span>Notre stock · {data?.foodProfile?.pantry.length ?? 0} aliments</span><span aria-hidden="true">→</span></Link>
    <div className="grid grid-cols-2 gap-1 rounded-[16px] bg-segment-bg p-1">{([['week', 'Ma semaine'], ['recipes', 'Les recettes']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)} className={`h-11 rounded-[12px] text-sm font-bold ${tab === value ? 'bg-surface shadow-segment' : 'text-muted'}`}>{label}</button>)}</div>
    <HouseholdStatus loading={household.isPending} error={household.isError && !data} retry={() => void household.refetch()} />
    {data && (tab === 'week' ? <>
      <Card className="flex flex-col gap-4 border-0 bg-positive-bg!">
        <div className="flex items-center justify-between gap-1"><button type="button" aria-label="Semaine précédente" className="flex h-11 w-11 shrink-0 items-center justify-center" onClick={() => setOffset((v) => v - 1)}><ChevronLeftIcon size={20} /></button><div className="text-center"><p className="text-sm font-bold">{displayDate(days[0], { day: 'numeric', month: 'short' })} – {displayDate(days[6], { day: 'numeric', month: 'short' })}</p><p className="mt-1 text-xs text-muted">{count} repas planifié{count > 1 ? 's' : ''}</p></div><button type="button" aria-label="Semaine suivante" className="flex h-11 w-11 shrink-0 items-center justify-center" onClick={() => setOffset((v) => v + 1)}><ChevronRightIcon size={20} /></button></div>
        {offset !== 0 && <button type="button" onClick={() => setOffset(0)} className="min-h-11 text-sm font-bold text-positive underline">Revenir à cette semaine</button>}{!count && <p className="text-sm leading-relaxed text-muted">Pour commencer, touche « Choisir un plat » sur un jour, ou demande des idées à l’assistant. Tu pourras ensuite créer la liste de courses.</p>}<Button onClick={generate} disabled={!count} isLoading={busy}>Préparer les courses</Button>
        <p className="text-xs leading-relaxed text-muted">Crée la liste d’ingrédients pour les repas de cette semaine. Vérifie ensuite ce que tu as déjà à la maison.</p>
      </Card>
      {days.map((date) => <div key={date} className="flex flex-col gap-2"><h2 className="px-1 text-sm font-bold capitalize">{displayDate(date)}</h2><Card padding="none" className="divide-y divide-border px-4">{(['lunch', 'dinner'] as const).map((mealSlot) => {
        const meal = data.meals[`${date}-${mealSlot}`]
        const recipe = recipes.find((r) => r.id === meal?.recipeId)
        const category = meal?.category ?? recipe?.category
        return <button key={mealSlot} type="button" onClick={() => { setSlot({ date, slot: mealSlot }); setSelected(meal?.recipeId ?? recipes[0]?.id ?? ''); setPortions(meal?.servings ?? 2) }} className="flex min-h-[76px] w-full items-center gap-3 py-3 text-left"><span className="w-12 shrink-0 text-xs text-muted">{mealSlot === 'lunch' ? 'Midi' : 'Soir'}</span><span className="min-w-0 flex-1"><span className={`block text-sm ${recipe ? 'font-bold' : 'text-muted'}`}>{recipe?.title ?? 'Choisir un plat'}</span>{meal && <span className="text-xs text-muted">{meal.servings} portions · {recipe?.minutes} min{category ? ` · ${MEAL_CATEGORIES[category]}` : ''}</span>}</span><PlusIcon size={18} /></button>
      })}</Card></div>)}
    </> : <>
      <Button onClick={() => setEditing('new')}><PlusIcon size={18} /> Créer une recette</Button>
      <label className="grid gap-1 text-xs font-semibold text-muted">Rechercher une recette<input type="search" className={fieldClass} placeholder="Un plat qui vous fait envie…" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
      <div className="flex gap-2">{[['all', 'Toutes'], ['mine', 'Mes recettes'], ['app', 'Nos idées']].map(([value, label]) => <button type="button" key={value} onClick={() => setSource(value)} aria-pressed={source === value} className={`min-h-11 rounded-full border px-3 text-xs font-semibold ${source === value ? 'border-ink bg-ink! text-white' : 'bg-surface'}`}>{label}</button>)}</div>
      {filtered.length === 0 && <Card className="text-sm text-muted">Aucune recette ici pour le moment. Crée ton premier plat pour commencer.</Card>}
      {filtered.map((recipe) => <button type="button" key={recipe.id} onClick={() => setViewing(recipe)} className="text-left"><Card className="flex items-center gap-4"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-positive-bg! text-2xl" aria-hidden="true">{recipe.source === 'app' ? '🥘' : '📖'}</span><div className="min-w-0 flex-1"><p className="text-[15px] font-bold">{recipe.title}</p><p className="mt-1 text-xs text-muted">{recipe.minutes} min · {recipe.servings} portions{recipe.category ? ` · ${MEAL_CATEGORIES[recipe.category]}` : ' · À classer'}</p><p className="mt-1 text-xs text-positive">{recipe.source === 'app' ? 'Sélection de l’application' : recipe.authorId === userId ? 'Ma recette' : 'Recette de mon partenaire'}</p></div><ChevronRightIcon size={18} /></Card></button>)}
    </>)}
    {editing && <HouseholdDialog title={editing === 'new' ? 'Créer une recette' : 'Modifier la recette'} onClose={() => setEditing(null)}><RecipeForm recipe={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSave={(payload) => send('recipe.save', payload)} /></HouseholdDialog>}
    {viewing && <HouseholdDialog title={viewing.title} onClose={() => setViewing(null)}><p className="mb-4 text-sm text-muted">{viewing.minutes} min · Pour {viewing.servings} personnes</p><p className="mb-4 text-xs font-semibold text-positive">{viewing.category ? MEAL_CATEGORIES[viewing.category] : 'À classer'}{viewing.categorySource === 'ai' ? ' · Suggestion IA, modifiable' : ''}</p><RecipeCategoryEditor recipe={viewing} onSave={async (payload) => { await send('recipe.category', payload); setViewing(null) }} /><h3 className="mb-2 font-bold">Ingrédients</h3><ul className="mb-5 divide-y divide-border">{viewing.ingredients.map((i, index) => <li className="flex justify-between gap-3 py-2 text-sm" key={index}><span>{i.name}</span><span className="shrink-0 font-semibold">{quantityLabel(i)}</span></li>)}</ul><h3 className="mb-2 font-bold">Préparation</h3><p className="mb-5 whitespace-pre-wrap text-sm leading-relaxed text-muted">{viewing.instructions}</p><Button className="w-full" onClick={() => { setViewing(null); setTab('week') }}>Planifier dans la semaine</Button>{viewing.authorId === userId && <Button variant="secondary" className="mt-2 w-full" onClick={() => { setEditing(viewing); setViewing(null) }}>Modifier ma recette</Button>}</HouseholdDialog>}
    {slot && <HouseholdDialog title={`${displayDate(slot.date)} · ${slot.slot === 'lunch' ? 'Déjeuner' : 'Dîner'}`} onClose={() => setSlot(null)}><div className="flex flex-col gap-4">{recipes.length ? <><label className="grid gap-2 text-sm font-semibold">Le plat<select className={fieldClass} value={selected} onChange={(e) => setSelected(e.target.value)}>{recipes.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold">Nombre de portions<input className={fieldClass} type="number" min={1} max={20} step={1} value={portions} onChange={(e) => setPortions(Number(e.target.value))} /></label><Button disabled={!selected || !Number.isInteger(portions) || portions < 1 || portions > 20} isLoading={busy} onClick={() => void saveMeal()}>Enregistrer ce repas</Button></> : <><p className="text-sm text-muted">Commence par enregistrer une recette.</p><Button onClick={() => { setSlot(null); setEditing('new') }}>Créer une recette</Button></>}{data?.meals[`${slot.date}-${slot.slot}`] && <Button variant="danger" disabled={busy} onClick={() => void saveMeal(true)}>Retirer ce repas</Button>}</div></HouseholdDialog>}
  </div>
}
