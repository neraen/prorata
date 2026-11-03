import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, ConfirmModal } from '../../components/ui'
import { useAuthStore, useCoupleStore, useToastStore } from '../../lib/stores'
import { ApiError } from '../../lib/api'
import { formatMoney } from '../../lib/utils'
import { displayDate, quantityLabel, useHousehold, type Meal } from './household'
import { HouseholdDialog, HouseholdStatus } from './MealsPage'
import { RecipeIllustration } from './RecipeIllustration'
import { PantryForm } from './PantryPage'
import { PantryPhotoDialog } from './PantryPhotoDialog'
import { fieldClass } from './RecipeForm'
import { assistantApi, dateKey, datesFrom, defaultMix, DEFAULT_PROFILE, DIETS, MEAL_CATEGORIES, type AssistantDraft, type MealCategory, type SuggestedMeal, type PantryItem } from './assistant'

const STEPS = ['Les repas', 'Nos envies', 'Notre stock', 'La semaine']
interface WizardState { step: number; start: string; excluded: string[]; includeLunch: boolean; servings: string | null; manualMix: Record<MealCategory, number> | null; instructions: string; budget: string; reviewId: string | null; signature: string; shopping: boolean; routeWeek: string | null }
function readWizard(key: string, routeWeek: string | null): Partial<WizardState> {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? 'null')
    if (!value || (routeWeek && routeWeek !== value.routeWeek) || typeof value.start !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.start) || !Array.isArray(value.excluded)) return {}
    return value
  } catch { return {} }
}

export function MealAssistantPage() {
  const household = useHousehold()
  const coupleId = useCoupleStore((s) => s.couple?.id)
  const userId = useAuthStore((s) => s.user?.id)
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const routeWeek = searchParams.get('week')
  const storageKey = `prorata-meal-wizard-${coupleId}-${userId}`
  const [saved] = useState(() => readWizard(storageKey, routeWeek))
  const today = dateKey()
  const initialDate = saved.start ?? routeWeek
  const [step, setStep] = useState(saved.step && saved.step >= 1 && saved.step <= 4 ? saved.step : 1)
  const [start, setStart] = useState(initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate) && initialDate >= today ? initialDate : today)
  const [excluded, setExcluded] = useState<string[]>(saved.excluded ?? [])
  const [includeLunch, setIncludeLunch] = useState(saved.includeLunch ?? false)
  const [servings, setServings] = useState<string | null>(saved.servings ?? null)
  const [manualMix, setManualMix] = useState<Record<MealCategory, number> | null>(saved.manualMix ?? null)
  const [instructions, setInstructions] = useState(saved.instructions ?? '')
  const [budget, setBudget] = useState(saved.budget ?? '')
  const [reviewId, setReviewId] = useState<string | null>(saved.reviewId ?? null)
  const [generatedSignature, setGeneratedSignature] = useState(saved.signature ?? '')
  const [shopping, setShopping] = useState(saved.shopping ?? true)
  const [draft, setDraft] = useState<AssistantDraft | null>(null)
  const [busy, setBusy] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')
  const [stockEditing, setStockEditing] = useState<PantryItem | undefined>()
  const [stockRemoving, setStockRemoving] = useState<PantryItem | null>(null)
  const [stockBusy, setStockBusy] = useState(false)
  const [stockDialog, setStockDialog] = useState<'manual' | 'photo' | null>(null)
  const [replacement, setReplacement] = useState<SuggestedMeal | null>(null)
  const [replacementId, setReplacementId] = useState('')
  const [replacing, setReplacing] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const lastRequest = useRef<{ signature: string; id: string } | null>(null)
  const status = useQuery({ queryKey: ['mealAssistant', coupleId, userId], queryFn: assistantApi.status, enabled: !!coupleId && !!userId, staleTime: 0 })
  const profile = household.data?.foodProfile ?? DEFAULT_PROFILE
  const portions = servings === null ? profile.servings : Number(servings)
  const dates = datesFrom(start)
  const selected = dates.flatMap((date) => (['lunch', 'dinner'] as const).filter((slot) => !excluded.includes(`${date}-${slot}`) && !household.data?.meals[`${date}-${slot}`] && (includeLunch || slot === 'dinner')).map((slot) => ({ date, slot })))
  const mix = manualMix ?? defaultMix(selected.length)
  const sum = Object.values(mix).reduce((a, b) => a + b, 0)
  const validMix = sum === selected.length && Object.values(mix).every((v) => Number.isInteger(v) && v >= 0 && v <= 14)
  const validStart = /^\d{4}-\d{2}-\d{2}$/.test(start) && start >= today && start <= dateKey(new Date(Date.now() + 84 * 86400000))
  const validPortions = Number.isInteger(portions) && portions >= 1 && portions <= 20
  const validBudget = budget === '' || (Number.isFinite(Number(budget)) && Number(budget) >= 1 && Number(budget) <= 10000)
  const payload = { slots: selected, mix, instructions, budgetCents: budget === '' ? null : Math.round(Number(budget) * 100), servings: portions }
  const signature = JSON.stringify({ payload, profile })
  const visibleDraft = draft ?? status.data?.draft
  const review = visibleDraft?.id === reviewId ? visibleDraft : null
  const reusable = review && generatedSignature === signature
  useEffect(() => {
    if (!coupleId || !userId) return
    try { sessionStorage.setItem(storageKey, JSON.stringify({ step, start, excluded, includeLunch, servings, manualMix, instructions, budget, reviewId, signature: generatedSignature, shopping, routeWeek: routeWeek ?? saved.routeWeek ?? null })) } catch { /* Navigation within the form still preserves state. */ }
  }, [storageKey, coupleId, userId, step, start, excluded, includeLunch, servings, manualMix, instructions, budget, reviewId, generatedSignature, shopping, routeWeek, saved.routeWeek])
  function go(next: number) {
    setError(''); setStep(next)
    requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ block: 'start', behavior: 'instant' }) })
  }
  function toggle(date: string, slot: Meal['slot'], checked: boolean) {
    const key = `${date}-${slot}`
    setExcluded((current) => checked ? current.filter((entry) => entry !== key) : [...current, key]); setManualMix(null)
  }
  async function generate() {
    if (!validStart || !selected.length || !validMix || !validBudget || !validPortions) { setError('Vérifie les jours, le nombre de personnes et les options avant de continuer.'); return }
    if (reusable) { go(4); return }
    setBusy(true); setError('')
    if (lastRequest.current?.signature !== signature) lastRequest.current = { signature, id: crypto.randomUUID() }
    try {
      const result = await assistantApi.generate({ id: lastRequest.current!.id, ...payload })
      setDraft(result); setReviewId(result.id); setGeneratedSignature(signature); lastRequest.current = null
      go(4)
      void queryClient.invalidateQueries({ queryKey: ['mealAssistant', coupleId, userId] })
    } catch (e) {
      if (e instanceof ApiError && !e.message.includes('en cours')) lastRequest.current = null
      setError(e instanceof Error ? e.message : 'La proposition n’a pas pu être préparée.'); void status.refetch()
    } finally { setBusy(false) }
  }
  async function accept() {
    if (!review) return
    setAccepting(true); setError('')
    try {
      await assistantApi.accept(review.id, shopping)
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['household', coupleId, userId] }), queryClient.invalidateQueries({ queryKey: ['mealAssistant', coupleId, userId] })])
      try { sessionStorage.removeItem(storageKey) } catch { /* No saved wizard. */ }
      toast(shopping ? 'Les repas et la liste de courses sont prêts' : 'Les repas ont été ajoutés au planning', 'success')
      navigate(shopping ? '/shopping' : `/meals?week=${review.proposal.meals[0]?.date ?? start}`)
    } catch (e) { setError(e instanceof Error ? e.message : 'Impossible de valider la semaine.') } finally { setAccepting(false) }
  }
  async function replace() {
    if (!replacement || !replacementId || !review) return
    setReplacing(true); setError('')
    try {
      setDraft(await assistantApi.replace(review.id, { date: replacement.date, slot: replacement.slot, recipeId: replacementId }))
      setReplacement(null); void status.refetch()
    } catch (e) { setError(e instanceof Error ? e.message : 'Remplacement impossible.') } finally { setReplacing(false) }
  }
  return <div className="grid gap-5">
    <Link to="/meals" className="min-h-11 py-2 text-sm font-semibold text-muted">← Retour au planning</Link>
    <header><p className="text-xs font-bold uppercase tracking-widest text-positive">Une étape à la fois</p><h1 className="mt-1 text-[28px] font-extrabold tracking-tight">Organiser notre semaine</h1><p className="mt-2 text-sm text-muted">Les repas, les envies, le stock. On s’occupe du reste.</p></header>
    <nav aria-label="Étapes de préparation"><ol className="grid grid-cols-4 gap-2">{STEPS.map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className={`rounded-xl p-2 text-center text-xs ${step === index + 1 ? 'bg-ink font-bold text-white' : 'bg-surface text-muted'}`}><span className="mb-1 block text-base font-bold">{index + 1}</span>{label}</li>)}</ol></nav>
    <HouseholdStatus loading={household.isPending || status.isPending} error={(household.isError && !household.data) || status.isError} retry={() => { void household.refetch(); void status.refetch() }} />
    {status.data && !status.data.enabled && <Card>L’assistant est indisponible pour le moment. Tu peux organiser tes repas directement depuis le planning.</Card>}
    {household.data && status.data?.enabled && <>
      {visibleDraft && !review && step !== 4 && <Card className="grid gap-2"><p className="text-sm text-muted">Une proposition précédente est encore à relire.</p><Button variant="secondary" onClick={() => { setReviewId(visibleDraft.id); go(4) }}>Reprendre cette proposition</Button></Card>}
      <h2 ref={heading} tabIndex={-1} className="scroll-mt-4 text-xl font-extrabold outline-none">Étape {step} sur 4 · {STEPS[step - 1]}</h2>
      {step === 1 && <Card><fieldset disabled={busy} className="grid gap-4"><h3 className="font-bold">Quand mange-t-on à la maison ?</h3><label className="grid gap-1 text-sm font-semibold">La semaine commence le<input className={fieldClass} type="date" min={today} max={dateKey(new Date(Date.now() + 84 * 86400000))} value={start} onChange={(e) => { if (e.target.value) { setStart(e.target.value); setExcluded([]); setManualMix(null) } }} /></label><label className="grid gap-1 text-sm font-semibold">Nombre de personnes<input className={fieldClass} type="number" min={1} max={20} step={1} value={servings === null ? profile.servings : servings} onChange={(e) => setServings(e.target.value)} /></label><label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" className="size-5 accent-positive" checked={includeLunch} onChange={(e) => { setIncludeLunch(e.target.checked); setManualMix(null) }} />Prévoir aussi les repas du midi</label><p className="text-sm text-muted">Décoche les repas pris ailleurs. Ceux déjà prévus restent en place.</p><div className="grid gap-2">{dates.map((date) => <fieldset key={date} className="flex items-center justify-between gap-2 border-b border-border py-2"><legend className="sr-only">{displayDate(date)}</legend><span aria-hidden="true" className="text-sm font-semibold capitalize">{displayDate(date)}</span><div className="flex gap-3">{(['lunch', 'dinner'] as const).map((slot) => {
        if (slot === 'lunch' && !includeLunch) return null
        const fixed = !!household.data?.meals[`${date}-${slot}`]
        return <label key={slot} className="flex min-h-11 items-center gap-2 text-sm"><input aria-label={`${displayDate(date)} · ${slot === 'lunch' ? 'Midi' : 'Soir'}`} type="checkbox" className="size-5 accent-positive" checked={!fixed && !excluded.includes(`${date}-${slot}`)} disabled={fixed} onChange={(e) => toggle(date, slot, e.target.checked)} /><span>{slot === 'lunch' ? 'Midi' : 'Soir'}{fixed && <span className="block text-xs text-muted">Déjà prévu</span>}</span></label>
      })}</div></fieldset>)}</div><p role="status" className="text-sm font-semibold">{selected.length} repas à préparer · {portions || '—'} personnes</p>{!selected.length && <p className="text-sm text-negative">Choisis au moins un repas libre pour continuer.</p>}{!validStart && <p className="text-sm text-negative">Choisis une date entre aujourd’hui et les 12 prochaines semaines.</p>}{!validPortions && <p className="text-sm text-negative">Choisis entre 1 et 20 personnes.</p>}<Button disabled={!validStart || !selected.length || !validPortions} onClick={() => go(2)}>Continuer vers nos envies</Button></fieldset></Card>}
      {step === 2 && <Card><fieldset disabled={busy} className="grid gap-4"><h3 className="font-bold">Quelles envies cette semaine ?</h3><p className="text-sm leading-relaxed text-muted">On te propose un mélange de plats du quotidien, équilibrés, plaisir et express. Tu peux garder ces choix et continuer.</p><div className="flex flex-wrap gap-2">{Object.entries(mix).filter(([, count]) => count > 0).map(([key, count]) => <span key={key} className="rounded-full bg-positive-bg px-3 py-2 text-sm">{count} {MEAL_CATEGORIES[key as MealCategory]}</span>)}</div><details><summary className="min-h-11 cursor-pointer py-2 text-sm font-bold">Personnaliser la répartition (facultatif)</summary><div className="mt-3 grid grid-cols-2 gap-3">{Object.entries(MEAL_CATEGORIES).map(([key, label]) => <label key={key} className="grid gap-1 text-sm">{label}<input className={fieldClass} type="number" min={0} max={14} step={1} value={mix[key as MealCategory]} onChange={(e) => setManualMix({ ...mix, [key]: Number(e.target.value) })} /></label>)}</div><p className="mt-2 text-xs text-muted">Un joker est un repas express : pizza surgelée, raviolis en conserve…</p><button type="button" className="min-h-11 text-sm font-bold underline" onClick={() => setManualMix(null)}>Revenir au mélange proposé</button></details>{!validMix && <p role="alert" className="text-sm text-negative">Répartis exactement {selected.length} repas au total (actuellement {sum}).</p>}<label className="grid gap-1 text-sm font-semibold">Budget pour ces repas (€, facultatif)<input className={fieldClass} type="number" min={1} max={10000} step={0.01} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Ex. 60" /></label>{!validBudget && <p role="alert" className="text-sm text-negative">Indique un budget entre 1 et 10 000 €, ou laisse ce champ vide.</p>}<label className="grid gap-1 text-sm font-semibold">Une envie particulière ? (facultatif)<textarea className={`${fieldClass} py-3`} rows={3} maxLength={1500} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Ex. Un repas express jeudi, un plat plaisir samedi." /></label><p className="text-xs text-muted">Tes préférences et allergies restent prises en compte. Les prix proposés seront indicatifs.</p><Link to="/meals/preferences" className="min-h-11 py-2 text-sm font-bold text-positive">Vérifier notre profil cuisine ({DIETS[profile.diet]}) →</Link><div className="grid gap-2"><Button disabled={!validMix || !validBudget} onClick={() => go(3)}>Continuer avec ces envies</Button><Button variant="secondary" onClick={() => go(1)}>Retour aux repas</Button></div></fieldset></Card>}
      {step === 3 && <Card><fieldset disabled={busy} className="grid gap-4"><h3 className="font-bold">Qu’a-t-on déjà à la maison ?</h3><p className="text-sm text-muted">Cette étape est facultative. L’assistant utilisera ton stock actuel pour limiter les achats à prévoir.</p>{profile.pantry.length ? <ul className="max-h-64 divide-y divide-border overflow-y-auto">{profile.pantry.map((item, index) => <li key={item.id ?? index} className="flex items-center gap-2 py-2 text-sm"><button type="button" aria-label={`Modifier ${item.name}`} className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 text-left" onClick={() => { setStockEditing(item); setStockDialog('manual') }}><span>{item.name}</span><span className="shrink-0 font-semibold">{quantityLabel(item)}</span></button><button type="button" className="min-h-11 px-2 text-xs font-semibold text-negative" disabled={!item.id} onClick={() => setStockRemoving(item)} aria-label={`Retirer ${item.name} du stock`}>Retirer</button></li>)}</ul> : <p className="rounded-xl bg-bg p-3 text-sm text-muted">Ton stock est vide. Tu peux le remplir maintenant ou continuer sans ajouter d’aliment.</p>}<Button variant="secondary" onClick={() => setStockDialog('photo')}>Photographier notre stock</Button><Button variant="secondary" onClick={() => { setStockEditing(undefined); setStockDialog('manual') }}>Ajouter un aliment à la main</Button><p className="text-sm font-semibold">Récapitulatif : {selected.length} repas pour {portions} personnes.</p>{(!validStart || !selected.length || !validPortions || !validMix || !validBudget) && <div role="alert" className="grid gap-2 text-sm text-negative"><p>Les repas ou les choix ont changé. Vérifie les étapes précédentes avant de demander la proposition.</p><Button variant="secondary" onClick={() => go(!validStart || !selected.length || !validPortions ? 1 : 2)}>Vérifier mes choix</Button></div>}{status.data.remaining <= 0 && !reusable && <p role="status" className="text-sm text-negative">Les demandes du couple sont épuisées pour aujourd’hui. Tu peux choisir les plats directement dans le planning ou revenir demain.</p>}<Button isLoading={busy} disabled={(!reusable && status.data.remaining <= 0) || !validStart || !selected.length || !validPortions || !validMix || !validBudget} onClick={() => void generate()}>{reusable ? 'Revoir notre semaine' : profile.pantry.length ? 'Proposer notre semaine avec ce stock' : 'Passer cette étape et proposer la semaine'}</Button><p className="text-xs text-muted">Une nouvelle proposition utilise une demande IA. Aucun repas n’est ajouté avant ta validation.</p><Button variant="secondary" onClick={() => go(2)}>Retour à nos envies</Button></fieldset></Card>}
      {busy && <p role="status" className="rounded-2xl bg-positive-bg p-4 text-sm">L’assistant prépare votre semaine. Cela peut prendre une minute. Garde cette page ouverte.</p>}
      {step === 4 && (review ? <><Review draft={review} accepting={accepting} replacing={replacing} shopping={shopping} onShopping={setShopping} onAccept={() => void accept()} onReplace={(meal) => { setError(''); setReplacement(meal); setReplacementId('') }} /><Button variant="secondary" disabled={accepting || replacing} onClick={() => go(3)}>Retour au stock et aux choix</Button></> : <Card className="grid gap-3"><p className="text-sm">Cette proposition n’est plus disponible ou a déjà été validée. Tes choix sont conservés.</p><Button onClick={() => go(1)}>Reprendre la préparation</Button></Card>)}
    </>}
    {error && <p role="alert" className="rounded-2xl bg-negative-bg p-4 text-sm text-negative">{error}</p>}
    {stockDialog === 'photo' && <PantryPhotoDialog stock={profile.pantry} onClose={() => setStockDialog(null)} onSave={(items) => household.send('pantry.import', { items })} />}
    {stockDialog === 'manual' && <HouseholdDialog title={stockEditing ? 'Modifier cet aliment' : 'Ajouter un aliment au stock'} onClose={() => setStockDialog(null)}><PantryForm initial={stockEditing} onSave={async (item) => { await household.send('pantry.save', item); setStockDialog(null) }} /></HouseholdDialog>}
    <ConfirmModal isOpen={!!stockRemoving} title="Retirer du stock" message={`Retirer « ${stockRemoving?.name ?? ''} » du stock ?`} confirmLabel="Retirer" isLoading={stockBusy} onClose={() => setStockRemoving(null)} onConfirm={() => {
      if (!stockRemoving?.id) return
      setStockBusy(true)
      void household.send('pantry.remove', { id: stockRemoving.id }).then(() => setStockRemoving(null)).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Retrait impossible.')).finally(() => setStockBusy(false))
    }} />
    {replacement && <HouseholdDialog title="Remplacer ce plat" onClose={() => { if (!replacing) setReplacement(null) }}><div className="grid gap-4"><p className="text-sm text-muted">Choisis une recette enregistrée pour remplacer « {replacement.title} ». Les contraintes du profil et le stock seront revérifiés, sans nouvel appel IA.</p><label className="grid gap-1 text-sm font-semibold">La recette<select className={fieldClass} value={replacementId} disabled={replacing} onChange={(e) => setReplacementId(e.target.value)}><option value="">Choisir une recette…</option>{household.data?.recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.title} · {recipe.minutes} min</option>)}</select></label>{error && <p role="alert" className="text-sm text-negative">{error}</p>}<Button disabled={!replacementId} isLoading={replacing} onClick={() => void replace()}>Utiliser cette recette</Button></div></HouseholdDialog>}
  </div>
}

function Review({ draft, accepting, replacing, shopping, onShopping, onAccept, onReplace }: { draft: AssistantDraft; accepting: boolean; replacing: boolean; shopping: boolean; onShopping: (value: boolean) => void; onAccept: () => void; onReplace: (meal: SuggestedMeal) => void }) {
  return <section className="flex flex-col gap-4" aria-label="Proposition de repas"><div><h2 className="mt-1 text-xl font-extrabold">Votre semaine à vérifier</h2><p className="mt-2 text-sm leading-relaxed text-muted">{draft.proposal.summary}</p></div><details className="rounded-[16px] border bg-surface p-4"><summary className="cursor-pointer text-sm font-semibold">Sur quoi reposent ces idées ?</summary><p className="mt-3 text-xs leading-relaxed text-muted">{draft.proposal.context.retrievedRecipes.length} recettes retrouvées dans votre bibliothèque · {draft.proposal.context.recentMealsCount} repas récemment planifiés · {draft.proposal.context.pantryItemsCount} ingrédients du stock.</p><p className="mt-2 text-xs text-muted">{draft.proposal.context.retrievedRecipes.map((r) => r.title).join(' · ') || 'Aucune recette enregistrée pertinente.'}</p></details>{draft.proposal.meals.map((meal) => <Card key={`${meal.date}-${meal.slot}`} className="flex flex-col gap-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold capitalize">{displayDate(meal.date)} · {meal.slot === 'dinner' ? 'Soir' : 'Midi'}</span><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${meal.category === 'joker' ? 'bg-laetitia-tint text-laetitia-text' : meal.category === 'pleasure' ? 'bg-cat-loisirs-bg text-cat-loisirs' : 'bg-positive-bg text-positive'}`}>{MEAL_CATEGORIES[meal.category]}</span></div><div className="flex items-center gap-3"><RecipeIllustration recipe={meal} className="h-24 w-24 shrink-0 rounded-2xl" /><h3 className="text-lg font-extrabold">{meal.title}</h3></div><p className="text-xs text-muted">{meal.minutes} min · {meal.servings} portions · {meal.existingRecipeId ? 'Votre bibliothèque' : 'Nouvelle idée'}</p><p className="text-sm leading-relaxed text-muted">{meal.reason}</p>{meal.pantryUsed.length > 0 && <p className="text-xs font-semibold text-positive">Du stock : {meal.pantryAllocations?.length ? meal.pantryAllocations.map((i) => `${i.name} (${quantityLabel({ ...i, aisle: 'other' })})`).join(', ') : meal.pantryUsed.join(', ')}</p>}{meal.estimatedCostCents !== null && <p className="text-xs text-muted">À compléter : environ {formatMoney(meal.estimatedCostCents)} pour ce repas</p>}<Button variant="secondary" disabled={accepting || replacing} onClick={() => onReplace(meal)}>Remplacer ce plat</Button><details><summary className="cursor-pointer py-2 text-sm font-semibold">Ingrédients et préparation</summary><ul className="divide-y divide-border">{meal.ingredients.map((i, index) => <li key={index} className="flex justify-between gap-3 py-2 text-sm"><span>{i.name}</span><span className="shrink-0">{quantityLabel(i)}</span></li>)}</ul><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">{meal.instructions}</p></details></Card>)}
      {draft.proposal.optimizationTips.length > 0 && <Card><h3 className="mb-2 font-bold">Pour vous simplifier la semaine</h3><ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-muted">{draft.proposal.optimizationTips.map((tip, i) => <li key={i}>{tip}</li>)}</ul></Card>}
      {(draft.proposal.warnings.length > 0 || draft.proposal.questions.length > 0 || draft.proposal.assumptions.length > 0) && <Card><h3 className="mb-2 font-bold">À vérifier avant de valider</h3><ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-muted">{[...draft.proposal.questions, ...draft.proposal.warnings, ...draft.proposal.assumptions].map((text, i) => <li key={i}>{text}</li>)}</ul></Card>}
      {draft.proposal.meals.length > 0 && <div className="grid gap-3 rounded-2xl border border-border bg-surface p-4"><label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" className="size-5 accent-positive" checked={shopping} disabled={accepting} onChange={(e) => onShopping(e.target.checked)} />Créer aussi notre liste de courses</label><p className="text-xs leading-relaxed text-muted">Les ingrédients des semaines concernées seront recalculés. Tes articles ajoutés à la main restent en place. Vérifie ensuite ce que tu as déjà en stock.</p><Button onClick={onAccept} isLoading={accepting} disabled={replacing}>{shopping ? 'Valider la semaine et créer les courses' : 'Valider et ajouter au planning'}</Button></div>}
    </section>
}
