import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ActionLink, Button, Card, ConfirmModal } from '../../components/ui'
import { PlusIcon, TrashIcon } from '../../components/icons'
import { AISLES, UNITS, quantityLabel, useHousehold, type Ingredient } from './household'
import { HouseholdDialog, HouseholdStatus } from './MealsPage'
import { IngredientIllustration } from './IngredientIllustration'
import { ingredientVisual } from './ingredientVisual'
import { FoodNameInput } from './FoodNameInput'
import { useMonthStore, useToastStore } from '../../lib/stores'
import { displayDate } from './household'
import { currentPlanningStart, shiftPlanningDate, validPlanningDate } from './planningDates'
import { fieldClass } from './RecipeForm'

export function ShoppingPage() {
  const household = useHousehold()
  const [params] = useSearchParams()
  const showToast = useToastStore((state) => state.show)
  const setMonth = useMonthStore((state) => state.setMonth)
  const formRef = useRef<HTMLFormElement>(null)
  const addingId = useRef(crypto.randomUUID())
  const [search, setSearch] = useState('')
  const [weekChoice, setWeek] = useState<string | null>(() => validPlanningDate(params.get('week')) ? params.get('week') : null)
  const { data, send, check, pendingCount } = household
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null)
  const [adding, setAdding] = useState(() => params.get('add') === '1')
  const [hideChecked, setHideChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [reference, setReference] = useState<Ingredient['reference']>(null)
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState<Ingredient['unit']>('piece')
  const [aisle, setAisle] = useState<Ingredient['aisle']>('other')
  const [error, setError] = useState('')
  const allItems = data?.shopping ?? []
  const weeks = [...new Set(allItems.flatMap((item) => item.week ? [item.week] : []))].sort()
  const preferredWeek = currentPlanningStart(data?.planningStart)
  const week = weekChoice ?? (data?.planningStart && weeks.includes(preferredWeek) ? preferredWeek : 'all')
  const items = allItems.filter((item) => week === 'all' || !item.week || item.week === week)
  const matches = items.filter((item) => item.name.toLocaleLowerCase('fr').includes(search.trim().toLocaleLowerCase('fr')))
  const done = items.filter((i) => i.checked).length
  async function add(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    const another = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'another'
    try {
      await send('shopping.add', { id: addingId.current, name, quantity: Number(quantity), unit, aisle, reference })
      addingId.current = crypto.randomUUID(); setName(''); setReference(null); setQuantity('1'); setUnit('piece')
      setAdding(another)
      if (another) { showToast('Article ajouté. Le suivant ?', 'success'); requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>('input[role=combobox]')?.focus()) }
    }
    catch (error) { setError(error instanceof Error ? error.message : 'Enregistrement impossible') }
    finally { setBusy(false) }
  }
  async function remove(id: string) {
    setBusy(true)
    try { await send('shopping.remove', { id }); setRemoving(null) } catch { /* Toast from send. */ }
    finally { setBusy(false) }
  }
  return <div className="flex flex-col gap-5">
    <header><p className="mb-1 text-xs font-bold uppercase tracking-widest text-positive">On n’oublie rien</p><h1 className="text-[30px] font-extrabold tracking-tight">Nos courses</h1><p className="mt-1 text-sm text-muted">Repas, maison, animaux : une liste partagée, rayon par rayon.</p></header>
    <HouseholdStatus loading={household.isPending} error={household.isError && !data} retry={() => void household.refetch()} />
    {data && <>
      <Card className="grid gap-3 bg-pastel-sage!"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-muted">Votre liste partagée</p><p className="mt-1 text-3xl font-extrabold">{items.length - done}<span className="ml-2 text-sm font-semibold">à prendre</span></p></div><Button className="h-11! shrink-0 text-sm!" onClick={() => setAdding(true)}><PlusIcon size={17} /> Ajouter</Button></div><progress aria-label="Avancement des courses" className="h-2 w-full accent-positive" max={Math.max(1, items.length)} value={done} /><p role="status" className="text-xs leading-relaxed text-muted">{pendingCount ? `${pendingCount} modification(s) gardée(s) sur cet appareil, à partager dès le retour de la connexion.` : `${done} sur ${items.length} cochés. Coche les articles quand tu les mets dans le panier.`}</p></Card>
      <div className="flex flex-wrap items-center justify-between gap-2"><Link to="/meals/stock" className="flex min-h-11 items-center text-sm font-semibold text-positive">Vérifier le stock →</Link>{items.length > 0 && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="size-5 accent-positive" checked={hideChecked} onChange={(e) => setHideChecked(e.target.checked)} /> Masquer les achats</label>}</div>
      {allItems.length > 0 && <label className="grid gap-1"><span className="sr-only">Rechercher un article</span><input type="search" className={fieldClass} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Trouver un article…" /></label>}
      {week !== 'all' && <p role="status" className="rounded-2xl bg-pastel-sage p-3 text-sm font-semibold">Courses du {displayDate(week, { day: 'numeric', month: 'short' })} au {displayDate(shiftPlanningDate(week, 6), { day: 'numeric', month: 'short' })}</p>}
      {weeks.length > 1 && <details className="rounded-2xl border bg-surface px-4"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">{week === 'all' ? 'Plusieurs semaines dans la liste' : `Semaine du ${displayDate(week, { day: 'numeric', month: 'short' })}`}</summary><label className="mb-3 grid gap-2 text-sm">Afficher les courses<select className={fieldClass} value={week} onChange={(e) => { setWeek(e.target.value); setSearch('') }}><option value="all">Toute la liste</option>{weeks.map((value) => <option key={value} value={value}>Semaine du {displayDate(value, { day: 'numeric', month: 'short' })}</option>)}</select><span className="text-xs text-muted">Les articles ajoutés à la main restent visibles dans toutes les semaines.</span></label></details>}
      {!allItems.length && <Card className="grid gap-4 bg-pastel-peach!"><h2 className="text-lg font-extrabold">La liste commence ici.</h2><p className="text-sm text-muted">Ajoute un premier article, ou prépare tes repas : leurs ingrédients formeront la liste.</p><Button onClick={() => setAdding(true)}>Ajouter mon premier article</Button><ActionLink secondary to="/meals/assistant">Préparer les repas</ActionLink></Card>}
      {items.length > 0 && matches.length === 0 && <Card className="grid gap-3"><p className="text-sm text-muted">Aucun article ne correspond à cette recherche.</p><Button variant="secondary" onClick={() => setSearch('')}>Effacer la recherche</Button></Card>}
      {items.length === 0 && allItems.length > 0 && <Card className="grid gap-3"><p className="text-sm text-muted">Aucun article dans cette semaine. Les autres courses sont toujours là.</p><Button variant="secondary" onClick={() => setWeek('all')}>Voir toute la liste</Button></Card>}
      {Object.entries(AISLES).map(([key, label]) => {
        const group = matches.filter((i) => i.aisle === key && (!hideChecked || !i.checked))
        if (!group.length) return null
        return <section key={key} className="flex flex-col gap-2"><h2 className="px-1 text-sm font-bold">{label} <span className="ml-1 font-normal text-muted">{group.length}</span></h2><Card padding="none" className="divide-y divide-border px-4">{group.map((item) => <div key={item.id} className="flex min-h-[72px] items-center gap-2"><label className="flex min-h-[72px] min-w-0 flex-1 cursor-pointer items-center gap-3 py-3"><input type="checkbox" className="h-6 w-6 shrink-0 accent-positive" checked={item.checked} onChange={() => check(item)} /><IngredientIllustration name={item.name} /><span className="min-w-0"><span className={`block text-sm font-semibold ${item.checked ? 'text-muted line-through' : ''}`}>{item.name}</span><span className="text-xs text-muted">{quantityLabel(item)}</span>{week === 'all' && weeks.length > 1 && item.week && <span className="mt-1 block text-[11px] text-muted">Semaine du {displayDate(item.week, { day: 'numeric', month: 'short' })}</span>}</span></label><button type="button" aria-label={`Retirer ${item.name}`} disabled={busy || pendingCount > 0} onClick={() => setRemoving({ id: item.id, name: item.name })} className="flex h-11 w-11 items-center justify-center text-muted disabled:opacity-30"><TrashIcon size={17} /></button></div>)}</Card></section>
      })}
      {hideChecked && matches.length > 0 && matches.every((item) => item.checked) && <Button variant="secondary" onClick={() => setHideChecked(false)}>Afficher les articles cochés</Button>}
      {items.length > 0 && done === items.length && <Card className="grid gap-3 bg-pastel-peach!"><h2 className="text-lg font-extrabold">Tout est dans le panier.</h2><p className="text-sm text-muted">Dernier petit geste : note le montant du ticket pour garder votre budget à jour.</p><ActionLink to="/expenses/new?category=groceries&title=Courses&returnTo=shopping" onClick={() => { const now = new Date(); setMonth(now.getFullYear(), now.getMonth() + 1) }}>Enregistrer le montant du ticket</ActionLink></Card>}
      <p className="text-xs leading-relaxed text-muted">Les pièces, grammes et millilitres restent des besoins distincts, réunis sur une ligne. Par exemple : 3 tomates + 350 g, sans conversion approximative.</p><p className="text-xs leading-relaxed text-muted">Cocher un article met à jour la liste. Pour suivre le montant réellement payé, ajoute ensuite ta dépense dans Budget.</p>
    </>}
    <ConfirmModal isOpen={!!removing} title="Retirer un article" message={`Retirer « ${removing?.name ?? ''} » de la liste ? Pour le marquer comme acheté, coche simplement sa case.`} confirmLabel="Retirer de la liste" onClose={() => setRemoving(null)} onConfirm={() => { if (removing) void remove(removing.id) }} isLoading={busy} />
    {adding && <HouseholdDialog title="Ajouter un article" onClose={() => { if (!busy) setAdding(false) }}><form ref={formRef} onSubmit={add}><fieldset disabled={busy} className="grid gap-4"><div><p className="mb-1 text-sm font-semibold">Article</p><FoodNameInput includeHousehold label="Article" value={name} onChange={(name, ref) => { setName(name); setReference(ref); const visual = ingredientVisual(name); if (visual) setAisle(visual.aisle) }} placeholder="Ex. Tomates, savon, litière…" /></div><div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-sm font-semibold">Quantité<input className={fieldClass} type="number" min={0.001} max={100000} step="any" required value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/^0+(?=\d)/, ''))} /></label><label className="grid gap-1 text-sm font-semibold">Unité<select className={fieldClass} value={unit} onChange={(e) => setUnit(e.target.value as Ingredient['unit'])}>{Object.entries(UNITS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div><label className="grid gap-1 text-sm font-semibold">Rayon<select className={fieldClass} value={aisle} onChange={(e) => setAisle(e.target.value as Ingredient['aisle'])}>{Object.entries(AISLES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{error && <p role="alert" className="text-sm text-negative">{error}</p>}<Button type="submit" isLoading={busy}>Ajouter aux courses</Button><Button type="submit" value="another" variant="secondary" disabled={busy}>Ajouter et continuer</Button></fieldset></form></HouseholdDialog>}
  </div>
}
