import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, ConfirmModal } from '../../components/ui'
import { PlusIcon, TrashIcon } from '../../components/icons'
import { AISLES, UNITS, quantityLabel, useHousehold, type Ingredient } from './household'
import { HouseholdDialog, HouseholdStatus } from './MealsPage'
import { FoodNameInput } from './FoodNameInput'
import { fieldClass } from './RecipeForm'

export function ShoppingPage() {
  const household = useHousehold()
  const { data, send, check, pendingCount } = household
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null)
  const [adding, setAdding] = useState(false)
  const [hideChecked, setHideChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [reference, setReference] = useState<Ingredient['reference']>(null)
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState<Ingredient['unit']>('piece')
  const [aisle, setAisle] = useState<Ingredient['aisle']>('other')
  const [error, setError] = useState('')
  const items = data?.shopping ?? []
  const done = items.filter((i) => i.checked).length
  async function add(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try { await send('shopping.add', { id: crypto.randomUUID(), name, quantity, unit, aisle, reference }); setName(''); setAdding(false) }
    catch (error) { setError(error instanceof Error ? error.message : 'Enregistrement impossible') }
    finally { setBusy(false) }
  }
  async function remove(id: string) {
    setBusy(true)
    try { await send('shopping.remove', { id }); setRemoving(null) } catch { /* Toast from send. */ }
    finally { setBusy(false) }
  }
  return <div className="flex flex-col gap-5">
    <header><p className="mb-1 text-xs font-bold uppercase tracking-widest text-positive">On n’oublie rien</p><h1 className="text-[30px] font-extrabold tracking-tight">Nos courses</h1><p className="mt-1 text-sm text-muted">Une liste pour vous deux, rayon par rayon.</p></header>
    <HouseholdStatus loading={household.isPending} error={household.isError && !data} retry={() => void household.refetch()} />
    {data && <>
      <Card className="flex flex-col gap-3 bg-positive-bg!"><div className="flex items-end justify-between"><span className="text-3xl font-extrabold">{items.length - done}<span className="ml-2 text-sm font-semibold">à prendre</span></span><span className="text-xs text-muted">{done} / {items.length} cochés</span></div><progress aria-label="Avancement des courses" className="h-2 w-full accent-positive" max={Math.max(1, items.length)} value={done} /><p role="status" className="text-xs text-muted">{pendingCount ? `${pendingCount} modification(s) enregistrée(s) sur cet appareil. Elles seront partagées dès que la connexion le permettra.` : 'Liste partagée à deux. Coche les articles quand tu les mets dans le panier.'}</p></Card>
      <Link to="/meals/stock" className="py-2 text-sm font-bold text-positive">Vérifier ce qu’on a déjà en stock →</Link>
      <Button onClick={() => setAdding(true)}><PlusIcon size={18} /> Ajouter un article</Button>
      {items.length > 0 && <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-positive" checked={hideChecked} onChange={(e) => setHideChecked(e.target.checked)} /> Masquer les articles cochés</label>}
      {!items.length && <Card className="flex flex-col gap-4 text-sm"><p className="text-muted">Votre liste est prête à accueillir vos envies. Planifiez des repas pour y ajouter les ingrédients, ou ajoutez vos articles à la main.</p><Link to="/meals" className="font-bold text-positive">Préparer notre semaine →</Link></Card>}
      {Object.entries(AISLES).map(([key, label]) => {
        const group = items.filter((i) => i.aisle === key && (!hideChecked || !i.checked))
        if (!group.length) return null
        return <section key={key} className="flex flex-col gap-2"><h2 className="px-1 text-sm font-bold">{label} <span className="ml-1 font-normal text-muted">{group.length}</span></h2><Card padding="none" className="divide-y divide-border px-4">{group.map((item) => <div key={item.id} className="flex min-h-[72px] items-center gap-2"><label className="flex min-h-[72px] min-w-0 flex-1 cursor-pointer items-center gap-3 py-3"><input type="checkbox" className="h-6 w-6 shrink-0 accent-positive" checked={item.checked} onChange={() => check(item)} /><span className="min-w-0"><span className={`block text-sm font-semibold ${item.checked ? 'text-muted line-through' : ''}`}>{item.name}</span><span className="text-xs text-muted">{quantityLabel(item)}</span></span></label><button type="button" aria-label={`Retirer ${item.name}`} disabled={busy || pendingCount > 0} onClick={() => setRemoving({ id: item.id, name: item.name })} className="flex h-11 w-11 items-center justify-center text-muted disabled:opacity-30"><TrashIcon size={17} /></button></div>)}</Card></section>
      })}
      {hideChecked && items.length > 0 && done === items.length && <Button variant="secondary" onClick={() => setHideChecked(false)}>Afficher les articles cochés</Button>}
      {items.length > 0 && done === items.length && <p role="status" className="text-center text-sm font-semibold text-positive">Tout est dans le panier !</p>}
      <p className="text-xs leading-relaxed text-muted">Cocher un article met à jour la liste. Pour suivre le montant réellement payé, ajoute ensuite ta dépense dans Budget.</p>
    </>}
    <ConfirmModal isOpen={!!removing} title="Retirer un article" message={`Retirer « ${removing?.name ?? ''} » de la liste ? Pour le marquer comme acheté, coche simplement sa case.`} confirmLabel="Retirer de la liste" onClose={() => setRemoving(null)} onConfirm={() => { if (removing) void remove(removing.id) }} isLoading={busy} />
    {adding && <HouseholdDialog title="Ajouter un article" onClose={() => setAdding(false)}><form onSubmit={add} className="flex flex-col gap-4"><div><p className="mb-1 text-sm font-semibold">Article</p><FoodNameInput label="Article" value={name} onChange={(name, ref) => { setName(name); setReference(ref) }} placeholder="Ex. Lait, tomates…" /></div><div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-sm font-semibold">Quantité<input className={fieldClass} type="number" min={0.001} max={100000} step="any" required value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} /></label><label className="grid gap-1 text-sm font-semibold">Unité<select className={fieldClass} value={unit} onChange={(e) => setUnit(e.target.value as Ingredient['unit'])}>{Object.entries(UNITS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div><label className="grid gap-1 text-sm font-semibold">Rayon<select className={fieldClass} value={aisle} onChange={(e) => setAisle(e.target.value as Ingredient['aisle'])}>{Object.entries(AISLES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{error && <p role="alert" className="text-sm text-negative">{error}</p>}<Button type="submit" isLoading={busy}>Ajouter aux courses</Button></form></HouseholdDialog>}
  </div>
}
