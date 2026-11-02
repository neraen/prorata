import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card } from '../../components/ui'
import { useToastStore } from '../../lib/stores'
import { useHousehold } from './household'
import { HouseholdStatus } from './MealsPage'
import { fieldClass } from './RecipeForm'
import { DEFAULT_PROFILE, DIETS, EQUIPMENT, type FoodProfile } from './assistant'

const split = (value: string) => value.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)
export function FoodProfilePage() {
  const household = useHousehold()
  return <div className="flex flex-col gap-5"><Link to="/meals/assistant" className="py-2 text-sm font-semibold text-muted">← Retour à l’assistant</Link><header><p className="mb-1 text-xs font-bold uppercase tracking-widest text-positive">L’assistant apprend à vous connaître</p><h1 className="text-[28px] font-extrabold tracking-tight">Notre profil cuisine</h1><p className="mt-2 text-sm leading-relaxed text-muted">Les préférences et contraintes de vous deux, pour proposer des repas adaptés à votre quotidien.</p></header><HouseholdStatus loading={household.isPending} error={household.isError && !household.data} retry={() => void household.refetch()} />{household.data && <ProfileForm initial={household.data.foodProfile ?? DEFAULT_PROFILE} save={(profile) => household.send('profile.preferences', profile)} />}</div>
}
function ProfileForm({ initial, save }: { initial: FoodProfile; save: (profile: Record<string, unknown>) => Promise<unknown> }) {
  const [profile, setProfile] = useState(initial)
  const [budget, setBudget] = useState(initial.weeklyBudgetCents === null ? '' : String(initial.weeklyBudgetCents / 100))
  const [lists, setLists] = useState({ allergies: initial.allergies.join(', '), dislikes: initial.dislikes.join(', '), favorites: initial.favorites.join(', '), jokerIdeas: initial.jokerIdeas.join(', ') })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const toast = useToastStore((s) => s.show)
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const payload = { ...profile, weeklyBudgetCents: budget === '' ? null : Math.round(Number(budget) * 100), allergies: split(lists.allergies), dislikes: split(lists.dislikes), favorites: split(lists.favorites), jokerIdeas: split(lists.jokerIdeas) }
      await save(payload); toast('Votre profil cuisine est enregistré', 'success')
    } catch (error) { setError(error instanceof Error ? error.message : 'Enregistrement impossible') }
    finally { setSaving(false) }
  }
  return <form onSubmit={submit} className="flex flex-col gap-5"><fieldset disabled={saving} className="flex flex-col gap-5">
    <Card className="grid gap-4"><h2 className="font-bold">Nos moyens et notre rythme</h2><div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-sm font-semibold">Portions par repas<input className={fieldClass} type="number" min={1} max={20} required value={profile.servings} onChange={(e) => setProfile({ ...profile, servings: Number(e.target.value) })} /></label><label className="grid gap-1 text-sm font-semibold">Temps total (min)<input className={fieldClass} type="number" min={5} max={180} required value={profile.maxMinutes} onChange={(e) => setProfile({ ...profile, maxMinutes: Number(e.target.value) })} /></label></div><label className="grid gap-1 text-sm font-semibold">Budget alimentaire hebdomadaire (€)<input className={fieldClass} type="number" min={1} max={10000} step={0.01} placeholder="Facultatif" value={budget} onChange={(e) => setBudget(e.target.value)} /></label><p className="text-xs leading-relaxed text-muted">Ce budget donne un repère. Tu pourras préciser un plafond pour les seuls repas demandés.</p><label className="grid gap-1 text-sm font-semibold">Nos habitudes<textarea className={`${fieldClass} py-3`} maxLength={2000} rows={4} placeholder="Ex. Mardi et jeudi, peu de temps. On aime cuisiner le dimanche. On emporte parfois les restes le midi." value={profile.habits} onChange={(e) => setProfile({ ...profile, habits: e.target.value })} /></label></Card>
    <Card className="grid gap-4"><h2 className="font-bold">Goûts et contraintes</h2><label className="grid gap-1 text-sm font-semibold">Notre alimentation<select className={fieldClass} value={profile.diet} onChange={(e) => setProfile({ ...profile, diet: e.target.value as FoodProfile['diet'] })}>{Object.entries(DIETS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>{([['allergies', 'Allergies et intolérances du couple', 'Ex. arachide, lait'], ['dislikes', 'Ce qu’on préfère éviter', 'Ex. coriandre, betterave'], ['favorites', 'Ce qu’on aime', 'Ex. cuisine italienne, curry, légumes rôtis'], ['jokerIdeas', 'Nos jokers préférés', 'Ex. raviolis en conserve, pizza surgelée']] as const).map(([key, label, placeholder]) => <label className="grid gap-1 text-sm font-semibold" key={key}>{label}<textarea className={`${fieldClass} py-3`} rows={2} maxLength={1500} value={lists[key]} placeholder={placeholder} onChange={(e) => setLists({ ...lists, [key]: e.target.value })} /></label>)}<p className="text-xs text-muted">Sépare les éléments par des virgules. Les contraintes doivent convenir aux deux personnes.</p></Card>
    <Card className="grid gap-3"><h2 className="font-bold">Notre équipement</h2><p className="text-xs text-muted">Coche ce qui est disponible. Sans sélection, l’assistant devra préciser ses hypothèses.</p>{EQUIPMENT.map((name) => <label key={name} className="flex min-h-10 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-positive" checked={profile.equipment.includes(name)} onChange={(e) => setProfile({ ...profile, equipment: e.target.checked ? [...profile.equipment, name] : profile.equipment.filter((v) => v !== name) })} />{name}</label>)}</Card>
    <Card className="grid gap-3"><h2 className="font-bold">Ce qu’on a déjà à la maison</h2><p className="text-sm text-muted">Le stock se gère dans un écran dédié, à la main ou avec une photo. Pas besoin de le saisir ici.</p><Link to="/meals/stock" className="flex min-h-11 items-center font-bold text-positive">Voir et modifier notre stock →</Link></Card>
    <p className="text-xs leading-relaxed text-muted">Ce profil est partagé avec ton partenaire. Lors d’une demande, il est transmis à OpenAI avec les recettes pertinentes et le planning récent pour personnaliser la proposition.</p>
    {error && <p role="alert" className="text-sm text-negative">{error}</p>}<Button type="submit" isLoading={saving}>Enregistrer notre profil</Button>
  </fieldset></form>
}
