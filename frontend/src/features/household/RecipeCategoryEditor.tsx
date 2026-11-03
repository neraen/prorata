import { useState } from 'react'
import { Button } from '../../components/ui'
import type { Recipe } from './household'
import { assistantApi, MEAL_CATEGORIES, type MealCategory } from './assistant'
import { fieldClass } from './RecipeForm'

export function RecipeCategoryEditor({ recipe, onSave }: { recipe: Recipe; onSave: (payload: Record<string, unknown>) => Promise<unknown> }) {
  const [category, setCategory] = useState<MealCategory | ''>(recipe.category ?? '')
  const [source, setSource] = useState<'user' | 'ai'>(recipe.categorySource === 'ai' ? 'ai' : 'user')
  const [reason, setReason] = useState(recipe.categoryReason ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function suggest() {
    setBusy(true); setError('')
    try { const result = await assistantApi.classify({ id: crypto.randomUUID(), recipe }); setCategory(result.category ?? ''); setReason(result.reason); setSource('ai') }
    catch (error) { setError(error instanceof Error ? error.message : 'Classement indisponible') }
    finally { setBusy(false) }
  }
  async function save() {
    setBusy(true); setError('')
    try { await onSave({ id: recipe.id, category: category || null, categorySource: source, categoryReason: reason || null }) }
    catch (error) { setError(error instanceof Error ? error.message : 'Enregistrement impossible') }
    finally { setBusy(false) }
  }
  return <fieldset disabled={busy} className="mb-5 grid gap-3 rounded-[16px] bg-bg p-3"><label className="grid gap-1 text-sm font-semibold">Pour nous, ce plat est…<select className={fieldClass} value={category} onChange={(e) => { setCategory(e.target.value as MealCategory | ''); setSource('user'); setReason('') }}><option value="">À classer</option>{Object.entries(MEAL_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><p className="text-xs leading-relaxed text-muted">Un type partagé pour votre couple, modifiable même pour une recette de l’application. Ton choix reste prioritaire.</p><Button type="button" variant="secondary" onClick={() => void suggest()} isLoading={busy}>Suggérer le type avec l’IA</Button>{reason && <p role="status" className="text-xs leading-relaxed text-positive">{reason}</p>}{error && <p role="alert" className="text-xs text-negative">{error}</p>}<Button type="button" onClick={() => void save()}>Enregistrer le type</Button></fieldset>
}
