import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, Card, ConfirmModal } from '../../components/ui'
import { PlusIcon } from '../../components/icons'
import { FOOD_AISLES, UNITS, quantityLabel, useHousehold, type Ingredient } from './household'
import type { PantryItem } from './assistant'
import { HouseholdDialog, HouseholdStatus } from './MealsPage'
import { fieldClass } from './RecipeForm'
import { PantryPhotoDialog } from './PantryPhotoDialog'
import { IngredientIllustration } from './IngredientIllustration'
import { FoodNameInput } from './FoodNameInput'

export function PantryPage() {
  const household = useHousehold()
  const [params] = useSearchParams()
  const [photoOpen, setPhotoOpen] = useState(() => params.get('photo') === '1')
  const [editing, setEditing] = useState<PantryItem | 'new' | null>(() => params.get('add') === '1' ? 'new' : null)
  const [removing, setRemoving] = useState<PantryItem | null>(null)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const stock = household.data?.foodProfile?.pantry ?? []
  const visible = stock.filter((i) => i.name.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')))
  async function remove() {
    if (!removing?.id) return
    setBusy(true)
    try { await household.send('pantry.remove', { id: removing.id }); setRemoving(null) } catch { /* Shared toast. */ }
    finally { setBusy(false) }
  }
  return <div className="flex flex-col gap-5"><Link to="/meals" className="py-2 text-sm font-semibold text-muted">← Retour aux repas</Link><header><p className="mb-1 text-xs font-bold uppercase tracking-widest text-positive">Avant de faire les courses</p><h1 className="text-[28px] font-extrabold tracking-tight">Notre stock</h1><p className="mt-2 text-sm leading-relaxed text-muted">Ce qu’il reste dans le frigo et les placards, partagé à deux.</p></header><Card className="bg-pastel-lilac!"><p className="text-2xl font-extrabold">{stock.length} <span className="text-sm font-semibold">aliment{stock.length > 1 ? 's' : ''} déclaré{stock.length > 1 ? 's' : ''}</span></p><p className="mt-2 text-xs leading-relaxed text-muted">L’assistant s’en sert pour proposer les repas. Actualise les quantités après utilisation : elles ne diminuent pas automatiquement.</p></Card><HouseholdStatus loading={household.isPending} error={household.isError && !household.data} retry={() => void household.refetch()} />{household.data && <><div className="grid gap-2"><Button onClick={() => setEditing('new')}><PlusIcon size={18} /> Ajouter au stock</Button><Button variant="secondary" onClick={() => setPhotoOpen(true)}>Ajouter depuis une photo</Button></div><label className="grid gap-1 text-xs font-semibold text-muted">Rechercher dans notre stock<input type="search" className={fieldClass} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Un aliment…" /></label>{!stock.length && <Card className="text-sm leading-relaxed text-muted">Commence par quelques aliments que vous avez déjà. Les suggestions t’évitent de saisir tous les noms à la main.</Card>}{stock.length > 0 && visible.length === 0 && <Card className="grid gap-3 text-sm"><p>Aucun aliment ne correspond à cette recherche.</p><Button variant="secondary" onClick={() => setSearch('')}>Revoir tout le stock</Button></Card>}{Object.entries(FOOD_AISLES).map(([key, label]) => {
    const items = visible.filter((i) => i.aisle === key)
    return items.length > 0 && <section key={key} className="grid gap-2"><h2 className="text-sm font-bold">{label}</h2><Card padding="none" className="divide-y divide-border px-4">{items.map((item, index) => <div key={item.id ?? index} className="flex items-center gap-2 py-3"><button type="button" className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setEditing(item)}><IngredientIllustration name={item.name} className="h-14 w-14" /><span className="min-w-0"><p className="text-sm font-bold">{item.name}</p><p className="mt-1 text-xs text-muted">{quantityLabel(item)}{item.expiresOn ? ` · Date indiquée : ${new Date(`${item.expiresOn}T12:00:00`).toLocaleDateString('fr-FR')}` : ''}</p>{item.reference && <p className="mt-1 text-[10px] text-positive">Référence Open Food Facts liée</p>}</span></button><button type="button" aria-label={`Retirer ${item.name} du stock`} disabled={!item.id} onClick={() => setRemoving(item)} className="min-h-11 px-2 text-xs font-semibold text-negative">Retirer</button></div>)}</Card></section>
  })}<Link to="/meals/assistant" className="py-2 text-sm font-bold text-positive">Préparer des repas avec ce stock →</Link></>}{photoOpen && <PantryPhotoDialog stock={stock} onClose={() => setPhotoOpen(false)} onSave={(items) => household.send('pantry.import', { items })} />}{editing && <HouseholdDialog title={editing === 'new' ? 'Ajouter au stock' : 'Modifier le stock'} onClose={() => setEditing(null)}><PantryForm initial={editing === 'new' ? undefined : editing} onSave={async (payload) => { await household.send('pantry.save', payload); setEditing(null) }} /></HouseholdDialog>}<ConfirmModal isOpen={!!removing} title="Retirer du stock" message={`Retirer ${removing?.name ?? 'cet aliment'} ? Tu pourras le rajouter si besoin.`} onClose={() => setRemoving(null)} onConfirm={() => void remove()} isLoading={busy} confirmLabel="Retirer" /></div>
}
export function PantryForm({ initial, onSave }: { initial?: PantryItem; onSave: (payload: Record<string, unknown>) => Promise<void> }) {
  const [item, setItem] = useState<PantryItem>(() => initial ?? { id: crypto.randomUUID(), name: '', quantity: 1, unit: 'piece', aisle: 'produce', expiresOn: null })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); try { await onSave({ ...item, id: item.id ?? crypto.randomUUID() }) } catch (e) { setError(e instanceof Error ? e.message : 'Enregistrement impossible') } finally { setBusy(false) } }
  return <form onSubmit={submit}><fieldset disabled={busy} className="grid gap-4"><div><p className="mb-1 text-sm font-semibold">Aliment</p><FoodNameInput label="Aliment du stock" value={item.name} onChange={(name, reference) => setItem({ ...item, name, reference })} placeholder="Ex. Carottes, lait, raviolis…" /><p className="mt-2 text-xs text-muted">Choisis une suggestion ou garde ton propre nom.</p></div><div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-sm font-semibold">Quantité<input className={fieldClass} type="number" min={0.001} max={100000} step="any" required value={item.quantity} onChange={(e) => setItem({ ...item, quantity: Number(e.target.value) })} /></label><label className="grid gap-1 text-sm font-semibold">Unité<select className={fieldClass} value={item.unit} onChange={(e) => setItem({ ...item, unit: e.target.value as Ingredient['unit'] })}>{Object.entries(UNITS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div><label className="grid gap-1 text-sm font-semibold">Rayon<select className={fieldClass} value={item.aisle} onChange={(e) => setItem({ ...item, aisle: e.target.value as Ingredient['aisle'] })}>{Object.entries(FOOD_AISLES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="grid gap-1 text-sm font-semibold">Date indiquée (facultatif)<input className={fieldClass} type="date" value={item.expiresOn ?? ''} onChange={(e) => setItem({ ...item, expiresOn: e.target.value || null })} /></label>{error && <p role="alert" className="text-sm text-negative">{error}</p>}<Button type="submit" isLoading={busy}>Enregistrer dans le stock</Button></fieldset></form>
}
