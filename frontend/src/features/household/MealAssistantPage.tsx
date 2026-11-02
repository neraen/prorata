import { useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card } from '../../components/ui'
import { useAuthStore, useCoupleStore, useToastStore } from '../../lib/stores'
import { ApiError } from '../../lib/api'
import { formatMoney } from '../../lib/utils'
import { displayDate, quantityLabel, useHousehold, type Meal } from './household'
import { HouseholdStatus } from './MealsPage'
import { fieldClass } from './RecipeForm'
import { assistantApi, dateKey, datesFrom, defaultMix, DEFAULT_PROFILE, DIETS, MEAL_CATEGORIES, type AssistantDraft, type MealCategory } from './assistant'

export function MealAssistantPage() {
  const household = useHousehold()
  const coupleId = useCoupleStore((s) => s.couple?.id)
  const userId = useAuthStore((s) => s.user?.id)
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialDate = searchParams.get('week')
  const today = dateKey()
  const [start, setStart] = useState(initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate) && initialDate >= today ? initialDate : today)
  const [slot, setSlot] = useState<Meal['slot']>('dinner')
  const [excluded, setExcluded] = useState<string[]>([])
  const [manualMix, setManualMix] = useState<Record<MealCategory, number> | null>(null)
  const [instructions, setInstructions] = useState('')
  const [budget, setBudget] = useState('')
  const [draft, setDraft] = useState<AssistantDraft | null>(null)
  const [busy, setBusy] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')
  // Reuse the same request identifier if a network response gets lost.
  const lastRequest = useRef<{ signature: string; id: string } | null>(null)
  const status = useQuery({ queryKey: ['mealAssistant', coupleId, userId], queryFn: assistantApi.status, enabled: !!coupleId && !!userId, staleTime: 0 })
  const profile = household.data?.foodProfile ?? DEFAULT_PROFILE
  const dates = datesFrom(start)
  const selected = dates.filter((date) => !excluded.includes(date) && !household.data?.meals[`${date}-${slot}`])
  const mix = manualMix ?? defaultMix(selected.length)
  const sum = Object.values(mix).reduce((a, b) => a + b, 0)
  const visibleDraft = draft ?? status.data?.draft
  const validMix = sum === selected.length && Object.values(mix).every((v) => Number.isInteger(v) && v >= 0 && v <= 7)
  function changeSelection(nextExcluded: string[]) { setExcluded(nextExcluded); setManualMix(null) }
  async function generate() {
    setBusy(true); setError('')
    const payload = { slots: selected.map((date) => ({ date, slot })), mix, instructions, budgetCents: budget === '' ? null : Math.round(Number(budget) * 100) }
    const signature = JSON.stringify(payload)
    if (lastRequest.current?.signature !== signature) lastRequest.current = { signature, id: crypto.randomUUID() }
    try {
      const result = await assistantApi.generate({ id: lastRequest.current!.id, ...payload })
      setDraft(result)
      lastRequest.current = null
      await queryClient.invalidateQueries({ queryKey: ['mealAssistant', coupleId, userId] })
      toast('Votre proposition est prête à relire', 'success')
    } catch (error) {
      if (error instanceof ApiError && !error.message.includes('en cours')) lastRequest.current = null
      setError(error instanceof Error ? error.message : 'La proposition n’a pas pu être préparée')
      void status.refetch()
    }
    finally { setBusy(false) }
  }
  async function accept() {
    if (!visibleDraft) return
    setAccepting(true); setError('')
    try {
      await assistantApi.accept(visibleDraft.id)
      await queryClient.invalidateQueries({ queryKey: ['household', coupleId, userId] })
      await queryClient.invalidateQueries({ queryKey: ['mealAssistant', coupleId, userId] })
      toast('Les repas ont été ajoutés à votre planning', 'success')
      navigate(`/meals?week=${visibleDraft.proposal.meals[0]?.date ?? start}`)
    } catch (error) { setError(error instanceof Error ? error.message : 'Impossible d’ajouter les repas') }
    finally { setAccepting(false) }
  }
  return <div className="flex flex-col gap-5">
    <Link to="/meals" className="py-2 text-sm font-semibold text-muted">← Retour aux repas</Link>
    <header><p className="mb-1 text-xs font-bold uppercase tracking-widest text-positive">Des idées qui vous ressemblent</p><h1 className="text-[28px] font-extrabold tracking-tight">Des idées pour nos repas</h1><p className="mt-2 text-sm leading-relaxed text-muted">Choisis les jours, reçois des idées, puis valide les repas qui te conviennent.</p></header>
    <Link to="/meals/preferences"><Card className="bg-positive-bg!"><div className="flex items-center justify-between gap-3"><h2 className="font-bold">Notre profil cuisine</h2><span className="text-sm font-bold text-positive">Modifier →</span></div><p className="mt-2 text-sm">{profile.servings} portions · {profile.maxMinutes} min · {DIETS[profile.diet]}</p><p className="mt-2 text-xs leading-relaxed text-muted">{profile.pantry.length} ingrédients en stock · {profile.allergies.length ? `${profile.allergies.length} contrainte(s) alimentaire(s)` : 'Allergies à vérifier dans le profil'} · {household.data?.recipes.length ?? 0} recettes enregistrées</p></Card></Link>
    <HouseholdStatus loading={household.isPending || status.isPending} error={(household.isError && !household.data) || status.isError} retry={() => { void household.refetch(); void status.refetch() }} />
    {status.data && !status.data.enabled && <Card><p className="text-sm text-muted">L’assistant sera disponible une fois sa connexion OpenAI configurée sur le serveur.</p></Card>}
    {household.data && status.data?.enabled && <details key={visibleDraft?.id ?? 'new'} open={!visibleDraft} className="rounded-[20px] border bg-surface p-4"><summary className="cursor-pointer py-2 text-sm font-bold">{visibleDraft ? 'Préparer une autre proposition' : 'Choisir nos repas'}</summary><Card className="mt-3 border-0! p-0!"><fieldset disabled={busy || accepting} className="grid gap-4"><h2 className="font-bold">1. Choisir les jours et le moment</h2><label className="grid gap-1 text-sm font-semibold">À partir du<input className={fieldClass} type="date" min={today} max={dateKey(new Date(Date.now() + 84 * 86400000))} value={start} onChange={(e) => { if (e.target.value) { setStart(e.target.value); changeSelection([]) } }} /></label><label className="grid gap-1 text-sm font-semibold">Moment du repas<select className={fieldClass} value={slot} onChange={(e) => { setSlot(e.target.value as Meal['slot']); changeSelection([]) }}><option value="dinner">Dîner</option><option value="lunch">Déjeuner</option></select></label><div className="grid gap-1">{dates.map((date) => {
      const fixed = !!household.data?.meals[`${date}-${slot}`]
      return <label key={date} className={`flex min-h-11 items-center gap-3 text-sm ${fixed ? 'text-muted' : ''}`}><input type="checkbox" className="h-5 w-5 accent-positive" disabled={fixed} checked={!fixed && !excluded.includes(date)} onChange={(e) => changeSelection(e.target.checked ? excluded.filter((d) => d !== date) : [...excluded, date])} /><span className="capitalize">{displayDate(date)}</span>{fixed && <span className="ml-auto text-xs">Déjà prévu</span>}</label>
    })}</div><p className="rounded-xl bg-positive-bg p-3 text-sm leading-relaxed">L’assistant répartit automatiquement les repas entre quotidien, équilibré, plaisir et repas express. Tu peux garder ce choix.</p><details className="rounded-xl border border-border p-3"><summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">Personnaliser les types de repas et le budget (facultatif)</summary><div className="mt-3 grid gap-4"><div><h3 className="mb-3 text-sm font-bold">Notre équilibre pour {selected.length} repas</h3><div className="grid grid-cols-2 gap-3">{Object.entries(MEAL_CATEGORIES).map(([key, label]) => <label key={key} className="grid gap-1 text-xs font-semibold">{label}<input className={fieldClass} type="number" min={0} max={7} step={1} value={mix[key as MealCategory]} onChange={(e) => setManualMix({ ...mix, [key]: Number(e.target.value) })} /></label>)}</div><p className={`mt-2 text-xs ${validMix ? 'text-muted' : 'text-negative'}`}>{sum} / {selected.length} repas répartis. Un « joker » est un repas express, par exemple une pizza surgelée ou des raviolis en conserve.</p></div><label className="grid gap-1 text-sm font-semibold">Budget pour ces repas (€)<input className={fieldClass} type="number" min={1} max={10000} step={0.01} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Facultatif, hors ingrédients du stock" /></label></div></details><label className="grid gap-1 text-sm font-semibold">Une envie ou une contrainte cette fois ?<textarea className={`${fieldClass} py-3`} maxLength={1500} rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Ex. Un joker jeudi, un plat plaisir samedi et utiliser nos courgettes. On aime les plats épicés mais doux." /></label><p className="text-xs leading-relaxed text-muted">L’assistant utilisera votre profil, les recettes pertinentes et les repas récemment planifiés. Les prix seront indicatifs ; les repas déjà prévus seront conservés.</p>{!selected.length && <p role="status" className="text-sm text-muted">Coche au moins un jour libre pour recevoir des idées. Les repas déjà prévus restent en place.</p>}{!validMix && <p role="alert" className="text-sm text-negative">Dans les options, répartis exactement {selected.length} repas au total, ou <button type="button" className="min-h-11 font-bold underline" onClick={() => setManualMix(null)}>rétablis la répartition automatique</button>.</p>}{status.data.remaining <= 0 && <p role="status" className="text-sm text-muted">Les demandes disponibles aujourd’hui ont été utilisées. Tu peux toujours choisir tes recettes à la main, ou revenir demain.</p>}<h2 className="font-bold">2. Recevoir des idées de repas</h2><Button type="button" onClick={() => void generate()} isLoading={busy} disabled={!validMix || !selected.length || status.data.remaining <= 0 || accepting || (budget !== '' && (!Number.isFinite(Number(budget)) || Number(budget) < 1))}>{visibleDraft ? 'Préparer une nouvelle proposition' : 'Proposer nos repas'}</Button><p className="text-center text-xs text-muted">{status.data.remaining} demande(s) restante(s) aujourd’hui pour le couple</p></fieldset></Card></details>}
    {busy && <p role="status" className="rounded-[16px] bg-positive-bg p-4 text-sm leading-relaxed text-positive">L’assistant recherche vos recettes et compose les repas. Cela peut prendre une minute. Votre planning sera modifié après votre validation.</p>}
    {error && <p role="alert" className="rounded-[16px] bg-negative-bg p-4 text-sm text-negative">{error}</p>}
    {visibleDraft && <section className="flex flex-col gap-4" aria-label="Proposition de repas"><div><p className="text-xs font-bold uppercase tracking-widest text-positive">À relire ensemble</p><h2 className="mt-1 text-xl font-extrabold">3. Vérifier et ajouter au planning</h2><p className="mt-2 text-sm leading-relaxed text-muted">{visibleDraft.proposal.summary}</p></div><details className="rounded-[16px] border bg-surface p-4"><summary className="cursor-pointer text-sm font-semibold">Sur quoi reposent ces idées ?</summary><p className="mt-3 text-xs leading-relaxed text-muted">{visibleDraft.proposal.context.retrievedRecipes.length} recettes retrouvées dans votre bibliothèque · {visibleDraft.proposal.context.recentMealsCount} repas récemment planifiés · {visibleDraft.proposal.context.pantryItemsCount} ingrédients du stock.</p><p className="mt-2 text-xs text-muted">{visibleDraft.proposal.context.retrievedRecipes.map((r) => r.title).join(' · ') || 'Aucune recette enregistrée pertinente.'}</p></details>{visibleDraft.proposal.meals.map((meal) => <Card key={`${meal.date}-${meal.slot}`} className="flex flex-col gap-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold capitalize">{displayDate(meal.date)} · {meal.slot === 'dinner' ? 'Soir' : 'Midi'}</span><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${meal.category === 'joker' ? 'bg-laetitia-tint text-laetitia-text' : meal.category === 'pleasure' ? 'bg-cat-loisirs-bg text-cat-loisirs' : 'bg-positive-bg text-positive'}`}>{MEAL_CATEGORIES[meal.category]}</span></div><h3 className="text-lg font-extrabold">{meal.title}</h3><p className="text-xs text-muted">{meal.minutes} min · {meal.servings} portions · {meal.existingRecipeId ? 'Votre bibliothèque' : 'Nouvelle idée'}</p><p className="text-sm leading-relaxed text-muted">{meal.reason}</p>{meal.pantryUsed.length > 0 && <p className="text-xs font-semibold text-positive">Du stock : {meal.pantryAllocations?.length ? meal.pantryAllocations.map((i) => `${i.name} (${quantityLabel({ ...i, aisle: 'other' })})`).join(', ') : meal.pantryUsed.join(', ')}</p>}{meal.estimatedCostCents !== null && <p className="text-xs text-muted">À compléter : environ {formatMoney(meal.estimatedCostCents)} pour ce repas</p>}<details><summary className="cursor-pointer py-2 text-sm font-semibold">Ingrédients et préparation</summary><ul className="divide-y divide-border">{meal.ingredients.map((i, index) => <li key={index} className="flex justify-between gap-3 py-2 text-sm"><span>{i.name}</span><span className="shrink-0">{quantityLabel(i)}</span></li>)}</ul><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">{meal.instructions}</p></details></Card>)}
      {visibleDraft.proposal.optimizationTips.length > 0 && <Card><h3 className="mb-2 font-bold">Pour vous simplifier la semaine</h3><ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-muted">{visibleDraft.proposal.optimizationTips.map((tip, i) => <li key={i}>{tip}</li>)}</ul></Card>}
      {(visibleDraft.proposal.warnings.length > 0 || visibleDraft.proposal.questions.length > 0 || visibleDraft.proposal.assumptions.length > 0) && <Card><h3 className="mb-2 font-bold">À vérifier avant de valider</h3><ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-muted">{[...visibleDraft.proposal.questions, ...visibleDraft.proposal.warnings, ...visibleDraft.proposal.assumptions].map((text, i) => <li key={i}>{text}</li>)}</ul></Card>}
      {visibleDraft.proposal.meals.length > 0 && <Button onClick={() => void accept()} isLoading={accepting} disabled={busy}>Valider et ajouter ces repas au planning</Button>}
    </section>}
  </div>
}
