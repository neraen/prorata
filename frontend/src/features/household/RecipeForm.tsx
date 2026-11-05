import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../components/ui'
import { PlusIcon, TrashIcon } from '../../components/icons'
import { useToastStore } from '../../lib/stores'
import { assistantApi, MEAL_CATEGORIES, type MealCategory } from './assistant'
import { FOOD_AISLES, UNITS, type Ingredient, type Recipe } from './household'
import { IngredientPicker } from './IngredientPicker'
import { IngredientIllustration } from './IngredientIllustration'
import { ingredientVisual } from './ingredientVisual'
import { foldFood, type FoodSuggestion } from './foodCatalog'

type IngredientDraft = Omit<Ingredient, 'quantity'> & { quantity: string }
function ingredientFromSuggestion(food: FoodSuggestion): Ingredient {
  const name = foldFood(food.name)
  const visual = ingredientVisual(food.name)
  const liquids = ['lait','creme','huile','vinaigre','sauce soja','lait de coco','coulis','bouillon']
  const weight = ['riz','pates','semoule','quinoa','boulgour','farine','flocons','sucre','chocolat','lentilles','pois chiches','haricots rouges','epinards','petits pois','haricots verts','champignons','beurre','fromage','yaourt','mozzarella','emmental','parmesan','feta','reblochon','tofu','sel','poivre','curry','paprika','cumin','noix','amandes','miel']
  const unit = food.reference?.type === 'product' ? 'piece' : visual?.unit ?? (liquids.some((prefix) => name.startsWith(prefix)) ? 'ml' : visual?.aisle === 'meat' || weight.some((prefix) => name.startsWith(prefix)) ? 'g' : 'piece')
  return { name: food.name, reference: food.reference, quantity: 1, unit, aisle: visual?.aisle ?? 'other' }
}
export const fieldClass = 'min-h-12 w-full rounded-[14px] border border-border bg-surface px-3 text-base text-ink'
export function RecipeForm({ recipe, onSave, onClose }: { recipe?: Recipe; onSave: (payload: Record<string, unknown>) => Promise<unknown>; onClose: () => void }) {
  const form = useRef<HTMLFormElement>(null)
  const deselectedIngredients = useRef(new Map<string, IngredientDraft[]>())
  const addButton = useRef<HTMLButtonElement>(null)
  const [recipeId] = useState(() => recipe?.id ?? crypto.randomUUID())
  const [title, setTitle] = useState(recipe?.title ?? '')
  const [servings, setServings] = useState(recipe?.servings ?? 2)
  const [category, setCategory] = useState<MealCategory | ''>(recipe?.category ?? '')
  const [categorySource, setCategorySource] = useState<'user' | 'ai'>(recipe?.categorySource === 'ai' ? 'ai' : 'user')
  const [categoryReason, setCategoryReason] = useState(recipe?.categoryReason ?? '')
  const [automatic, setAutomatic] = useState(true)
  const [minutes, setMinutes] = useState(recipe?.minutes ?? 30)
  const [cost, setCost] = useState(recipe?.estimatedCostCents == null ? '' : String(recipe.estimatedCostCents / 100))
  const [instructions, setInstructions] = useState(recipe?.instructions ?? '')
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(recipe?.ingredients.map((item) => ({ ...item, quantity: String(item.quantity) })) ?? [])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [classifying, setClassifying] = useState(false)
  const [error, setError] = useState('')
  const toast = useToastStore((s) => s.show)
  function closePicker() {
    setPickerOpen(false)
    requestAnimationFrame(() => (form.current?.querySelector<HTMLInputElement>('input[aria-label^="Quantité"]:invalid') ?? addButton.current)?.focus())
  }
  const busy = saving || classifying
  function change(index: number, patch: Partial<IngredientDraft>) { setIngredients((all) => all.map((item, i) => i === index ? { ...item, ...patch } : item)) }
  const content = { title, servings, minutes, instructions, ingredients: ingredients.map((item) => ({ ...item, quantity: Number(item.quantity) })) }
  async function classification() {
    return assistantApi.classify({ id: crypto.randomUUID(), recipe: content })
  }
  async function suggest() {
    setClassifying(true); setError('')
    try {
      const result = await classification()
      setCategory(result.category ?? ''); setCategorySource('ai'); setCategoryReason(result.reason); if (!result.category) setAutomatic(false)
    } catch (error) { setError(error instanceof Error ? error.message : 'Classement indisponible. Tu peux choisir un type ou laisser la recette à classer.') }
    finally { setClassifying(false) }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!ingredients.length) { setError('Ajoute au moins un ingrédient pour enregistrer ta recette.'); return }
    setSaving(true); setError('')
    let selected: MealCategory | null = category || null
    let source: 'user' | 'ai' = categorySource
    let reason = categoryReason
    let classificationFailed = false
    try {
      if (selected === null && automatic) {
        try { const result = await classification(); selected = result.category; reason = result.reason; source = 'ai' }
        catch { classificationFailed = true }
      }
      await onSave({ id: recipeId, ...content, estimatedCostCents: cost === '' ? null : Math.round(Number(cost) * 100), category: selected, categorySource: selected ? source : null, categoryReason: reason || null })
      if (classificationFailed) toast('Recette enregistrée sans classement : l’IA est indisponible.', 'success')
      onClose()
    } catch (error) { setError(error instanceof Error ? error.message : 'Enregistrement impossible') }
    finally { setSaving(false) }
  }
  return <><form ref={form} onSubmit={submit}><fieldset disabled={busy} className="flex flex-col gap-4">
    {recipe && <p className="rounded-xl bg-pastel-sage p-3 text-xs leading-relaxed">Tu modifies la recette du couple. Elle reste liée aux repas déjà prévus. Si ses ingrédients changent, prépare de nouveau les courses depuis Ma semaine.</p>}
    <label className="grid gap-1 text-sm font-semibold">Nom de la recette<input className={fieldClass} required maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Gratin de légumes" /></label>
    <div className="grid grid-cols-2 gap-3">
      <label className="grid gap-1 text-sm font-semibold">Portions<input className={fieldClass} type="number" min={1} max={20} required value={servings} onChange={(e) => setServings(Number(e.target.value))} /></label>
      <label className="grid gap-1 text-sm font-semibold">Durée (minutes)<input className={fieldClass} type="number" min={1} max={1440} required value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></label>
    </div>
    <label className="grid gap-1 text-sm font-semibold">Type de repas (facultatif)<select className={fieldClass} value={category} onChange={(e) => { setCategory(e.target.value as MealCategory | ''); setCategorySource('user'); setCategoryReason('') }}><option value="">À classer</option>{Object.entries(MEAL_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <p className="text-xs leading-relaxed text-muted">Quotidien pour la simplicité, Équilibré pour la composition, Plaisir pour la gourmandise, Joker pour le dépannage. Ce sont des intentions, pas des notes nutritionnelles.</p>
    <Button type="button" variant="secondary" isLoading={classifying} disabled={!title.trim() || !ingredients.some((i) => i.name.trim()) || saving} onClick={() => void suggest()}>Suggérer un type avec l’IA</Button>
    {categoryReason && <p role="status" className="rounded-xl bg-positive-bg p-3 text-xs leading-relaxed text-positive">Suggestion IA : {categoryReason} Tu peux modifier le type proposé.</p>}
    {!category && <label className="flex items-start gap-3 text-xs leading-relaxed"><input className="mt-0.5 h-5 w-5 shrink-0 accent-positive" type="checkbox" checked={automatic} onChange={(e) => setAutomatic(e.target.checked)} />Demander à l’IA si je laisse le type vide. La recette restera enregistrable si le classement n’est pas disponible.</label>}
    <h3 className="font-bold text-ink">Ingrédients <span className="font-normal text-muted">({ingredients.length})</span></h3>
    {!ingredients.length && <p className="rounded-2xl bg-pastel-sage p-4 text-sm text-muted">Choisis les aliments de ta recette, puis indique les quantités ici.</p>}
    {ingredients.map((item, index) => <fieldset className="grid grid-cols-2 gap-2 rounded-[16px] bg-bg p-3" key={index}>
      <legend className="sr-only">Ingrédient {index + 1}</legend>
      <div className="col-span-2 flex items-center gap-3"><IngredientIllustration name={item.name} className="h-14 w-14" /><label className="grid min-w-0 flex-1 gap-1 text-xs font-semibold text-muted">Ingrédient {index + 1}<input aria-label={`Nom de l’ingrédient ${index + 1}`} required maxLength={100} className={fieldClass} value={item.name} onChange={(event) => { const name = event.target.value; change(index, { name, reference: null, aisle: ingredientVisual(name)?.aisle ?? item.aisle }) }} /></label></div>
      <label className="grid gap-1 text-xs font-semibold text-muted">Quantité<input aria-label={`Quantité de l’ingrédient ${index + 1}`} className={fieldClass} required type="number" min={0.001} max={100000} step="any" inputMode="decimal" placeholder="Quantité" value={item.quantity} onChange={(e) => change(index, { quantity: e.target.value.replace(/^0+(?=\d)/, '') })} /></label>
      <label className="grid gap-1 text-xs font-semibold text-muted">Unité<select aria-label={`Unité de l’ingrédient ${index + 1}`} className={fieldClass} value={item.unit} onChange={(e) => change(index, { unit: e.target.value as Ingredient['unit'] })}>{Object.entries(UNITS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <select aria-label={`Rayon de l’ingrédient ${index + 1}`} className={fieldClass} value={item.aisle} onChange={(e) => change(index, { aisle: e.target.value as Ingredient['aisle'] })}>{Object.entries(FOOD_AISLES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      <button type="button" onClick={() => setIngredients((all) => all.filter((_, i) => i !== index))} className="flex items-center justify-center gap-2 text-negative disabled:opacity-30" aria-label={`Retirer l’ingrédient ${index + 1}`}><TrashIcon size={18} /> Retirer</button>
    </fieldset>)}
    <Button ref={addButton} type="button" variant="secondary" disabled={ingredients.length >= 100} onClick={() => setPickerOpen(true)}><PlusIcon size={18} /> Ajouter un ingrédient</Button>
    <label className="grid gap-1 text-sm font-semibold">Préparation (facultative)<textarea className={`${fieldClass} py-3`} maxLength={10000} rows={5} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Les étapes, si tu souhaites les noter…" /></label>
    <label className="grid gap-1 text-sm font-semibold">Prix estimé de la recette entière (€, facultatif)<input className={fieldClass} type="number" min={0} max={10000} step="0.01" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Ex. 6,80 pour toutes les portions" /><span className="text-xs font-normal text-muted">Ton estimation, pas un prix en magasin. Elle sera affichée par portion dans le choix des plats.</span></label>
    {error && <p role="alert" className="text-sm text-negative">{error}</p>}
    <Button type="submit" isLoading={saving}disabled={!ingredients.length}>{ingredients.length ? 'Enregistrer la recette' : 'Ajoute au moins un ingrédient'}</Button>
    <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
  </fieldset></form>{pickerOpen && <IngredientPicker ingredients={content.ingredients} onClose={closePicker} onRemove={(food, indexes) => { deselectedIngredients.current.set(food.name, ingredients.filter((_, index) => indexes.includes(index))); setIngredients((all) => all.filter((_, index) => !indexes.includes(index))) }} onAdd={(food) => { const restored = deselectedIngredients.current.get(food.name); deselectedIngredients.current.delete(food.name); setIngredients((all) => [...all, ...(restored ?? [{ ...ingredientFromSuggestion(food), quantity: '' }])]); setError('') }} />}</>
}
