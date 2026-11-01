import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../components/ui'
import type { PantryItem } from './assistant'
import { FoodNameInput } from './FoodNameInput'
import { foldFood } from './foodCatalog'
import { AISLES, UNITS } from './household'
import { HouseholdDialog } from './MealsPage'
import { inspectPantryPhoto, preparePantryPhoto, type PantryPhotoResult, type PhotoFood } from './pantryPhoto'
import { fieldClass } from './RecipeForm'

interface ReviewFood extends Omit<PhotoFood, 'quantity'> { quantity: string; selected: boolean; expiresOn: string }
export function PantryPhotoDialog({ stock, onClose, onSave }: { stock: PantryItem[]; onClose: () => void; onSave: (items: PantryItem[]) => Promise<unknown> }) {
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const [image, setImage] = useState('')
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())
  const [result, setResult] = useState<PantryPhotoResult | null>(null)
  const [items, setItems] = useState<ReviewFood[]>([])
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('')
  const [error, setError] = useState('')
  async function choose(file?: File) {
    if (!file) return
    setBusy(true); setPhase('Préparation de la photo…'); setError(''); setResult(null); setItems([]); setImage('')
    try { setImage(await preparePantryPhoto(file)); setRequestId(crypto.randomUUID()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Photo illisible.') }
    finally { setBusy(false) }
  }
  async function analyse() {
    setBusy(true); setPhase('Identification des aliments…'); setError('')
    try {
      const data = await inspectPantryPhoto(requestId, image)
      setResult(data)
      setItems(data.items.map((item) => ({ ...item, quantity: item.quantity === null ? '' : String(item.quantity), selected: item.confidence !== 'low', expiresOn: '' })))
    } catch (e) { setError(e instanceof Error ? e.message : 'Analyse impossible.'); setRequestId(crypto.randomUUID()) }
    finally { setBusy(false) }
  }
  function update(index: number, changes: Partial<ReviewFood>) { setItems((current) => current.map((item, i) => i === index ? { ...item, ...changes } : item)) }
  const selected = items.filter((item) => item.selected)
  const names = selected.map((item) => foldFood(item.name.trim()))
  const duplicateNames = new Set(names).size !== names.length
  async function save(e: FormEvent) {
    e.preventDefault()
    if (!selected.length || duplicateNames || !result) return
    setBusy(true); setPhase('Enregistrement du stock…'); setError('')
    try {
      await onSave(items.flatMap((item, index) => {
        if (!item.selected) return []
        const existing = stock.find((entry) => foldFood(entry.name) === foldFood(item.name))
        return [{ id: existing?.id ?? `photo-${result.id}-${index}`, name: item.name.trim(), quantity: Number(item.quantity), unit: item.unit, aisle: item.aisle, expiresOn: item.expiresOn || existing?.expiresOn || null, reference: item.reference ?? existing?.reference ?? null }]
      }))
      onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'Enregistrement impossible.') }
    finally { setBusy(false) }
  }
  return <HouseholdDialog title="Ajouter depuis une photo" onClose={() => { if (!busy) onClose() }}>
    <div className="grid gap-4">
      <p className="text-sm leading-relaxed text-muted">Photographie ton frigo ou tes placards bien éclairés. Tu pourras corriger chaque aliment avant de l’ajouter.</p>
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Prendre une photo du stock" onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = '' }} />
      <input ref={gallery} type="file" accept="image/*" className="hidden" aria-label="Choisir une photo du stock" onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = '' }} />
      <div className="grid grid-cols-2 gap-2"><Button variant="secondary" disabled={busy} onClick={() => camera.current?.click()}>Prendre une photo</Button><Button variant="secondary" disabled={busy} onClick={() => gallery.current?.click()}>Photothèque</Button></div>
      {image && <img src={image} alt="Photo du stock à analyser" className="max-h-56 w-full rounded-2xl bg-bg object-contain" />}
      {!result && <><p className="text-xs leading-relaxed text-muted">En lançant l’analyse, cette photo est envoyée à OpenAI. Elle n’est pas conservée dans l’application. Une analyse utilise une demande du quota IA du couple.</p><Button disabled={!image || busy} onClick={() => void analyse()}>Analyser avec l’IA</Button></>}
      {busy && <p role="status" className="text-sm font-semibold text-positive">{phase}</p>}
      {error && <p role="alert" className="text-sm text-negative">{error}</p>}
      {result && <form onSubmit={(e) => void save(e)}><fieldset disabled={busy} className="grid gap-4">
        <div className="rounded-2xl bg-positive-bg p-3"><h3 className="font-bold">Vérifier les aliments détectés</h3><p className="mt-1 text-xs leading-relaxed">Coche ce que tu veux ajouter et vérifie les quantités. Les aliments peu certains sont décochés. Aucune date ni fraîcheur n’est déduite de l’image.</p></div>
        {result.warnings.map((warning, i) => <p key={i} className="text-xs text-muted">{warning}</p>)}
        {!items.length && <p className="text-sm text-muted">Aucun aliment identifiable. Essaie une photo plus nette et plus proche.</p>}
        {items.map((item, index) => {
          const existing = stock.find((entry) => foldFood(entry.name) === foldFood(item.name))
          return <section key={index} className="grid gap-3 rounded-2xl border border-border p-3">
            <label className="flex min-h-11 items-center gap-3 text-sm font-bold"><input type="checkbox" className="size-5 accent-ink" checked={item.selected} onChange={(e) => update(index, { selected: e.target.checked })} />{item.name}<span className="ml-auto text-[10px] font-normal text-muted">{item.confidence === 'high' ? 'Identification nette' : item.confidence === 'medium' ? 'À vérifier' : 'Incertain'}</span></label>
            {item.note && <p className="text-xs text-muted">{item.note}</p>}
            {item.selected && <><FoodNameInput label={`Nom de l’aliment ${index + 1}`} value={item.name} onChange={(name, reference) => update(index, { name, reference })} /><div className="grid grid-cols-2 gap-2"><label className="grid gap-1 text-xs font-semibold">Quantité à confirmer<input aria-label={`Quantité de l’aliment ${index + 1}`} className={fieldClass} type="number" min={0.001} max={100000} step="any" required value={item.quantity} placeholder="À renseigner" onChange={(e) => update(index, { quantity: e.target.value })} /></label><label className="grid gap-1 text-xs font-semibold">Unité<select className={fieldClass} value={item.unit} onChange={(e) => update(index, { unit: e.target.value as PhotoFood['unit'] })}>{Object.entries(UNITS).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label></div><label className="grid gap-1 text-xs font-semibold">Rayon<select className={fieldClass} value={item.aisle} onChange={(e) => update(index, { aisle: e.target.value as PhotoFood['aisle'] })}>{Object.entries(AISLES).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label><label className="grid gap-1 text-xs font-semibold">Date lue sur l’emballage (facultatif)<input className={fieldClass} type="date" value={item.expiresOn} onChange={(e) => update(index, { expiresOn: e.target.value })} /></label>{existing && <p className="text-xs font-semibold text-positive">Déjà dans votre stock : la quantité sera remplacée par celle-ci.</p>}</>}
          </section>
        })}
        {duplicateNames && <p role="alert" className="text-sm text-negative">Deux lignes ont le même nom. Décoche le doublon ou précise leurs noms.</p>}
        {!!items.length && <Button type="submit" disabled={!selected.length || duplicateNames} isLoading={busy}>Enregistrer {selected.length} aliment{selected.length > 1 ? 's' : ''}</Button>}
      </fieldset></form>}
    </div>
  </HouseholdDialog>
}
