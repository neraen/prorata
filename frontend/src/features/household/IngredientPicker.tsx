import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../../components/ui'
import { PlusIcon } from '../../components/icons'
import { apiFetch } from '../../lib/api'
import { HouseholdDialog } from './HouseholdDialog'
import { IngredientIllustration } from './IngredientIllustration'
import { COMMON_FOODS, foldFood, type FoodSuggestion } from './foodCatalog'
import { useHousehold, type Ingredient } from './household'

const aliases = new Map([
  ['tomate','tomates'], ['carotte','carottes'], ['courgette','courgettes'],
  ['pomme de terre','pommes de terre'], ['patate douce','patates douces'],
  ['oignon','oignons'], ['poireau','poireaux'], ['champignon','champignons'],
  ['poivron','poivrons'], ['aubergine','aubergines'], ['concombre','concombres'],
  ['avocat','avocats'], ['citron','citrons'], ['pomme','pommes'], ['banane','bananes'],
  ['poire','poires'], ['orange','oranges'], ['fraise','fraises'], ['oeuf','oeufs'],
  ['brocoli','brocolis'], ['chou-fleur','choux-fleurs'],
].flatMap(([singular, plural]) => [[singular, singular], [plural, singular]] as [string, string][]))
const nameKey = (name: string) => {
  const normalized = foldFood(name).replaceAll('’', "'").replace(/\s+/g, ' ')
  return aliases.get(normalized) ?? normalized
}

export function IngredientPicker({ ingredients, onAdd, onRemove, onClose }: { ingredients: Ingredient[]; onAdd: (food: FoodSuggestion) => void; onRemove: (food: FoodSuggestion, indexes: number[]) => void; onClose: () => void }) {
  const { data } = useHousehold()
  const searchInput = useRef<HTMLInputElement>(null)
  const [sessionFoods, setSessionFoods] = useState<FoodSuggestion[]>([])
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [remoteQuery, setRemoteQuery] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const needle = nameKey(search)
  const remote = useQuery({ queryKey: ['foodSuggestions', foldFood(remoteQuery)], queryFn: () => apiFetch<{ items: FoodSuggestion[]; available: boolean }>(`/foods/suggestions?q=${encodeURIComponent(remoteQuery)}`), enabled: remoteQuery.length >= 2, staleTime: 604800000, retry: false })
  const unique = new Map<string, FoodSuggestion>()
  const own = [...sessionFoods, ...ingredients, ...(data?.foodProfile?.pantry ?? []), ...(data?.recipes.filter((recipe) => recipe.source !== 'app' || Object.values(data.meals).some((meal) => (meal.recipeId === recipe.id || meal.extra?.recipeId === recipe.id))).slice().reverse().flatMap((recipe) => recipe.ingredients) ?? [])]
  for (const item of [...own.map((item): FoodSuggestion => ({ name: item.name, reference: item.reference ?? null, origin: 'personal' })), ...COMMON_FOODS]) {
    const key = nameKey(item.name)
    if ((!needle || key.includes(needle) || item.aliases?.some((alias) => nameKey(alias).includes(needle))) && !unique.has(key)) unique.set(key, item)
  }
  const remoteMatches = remoteQuery !== '' && nameKey(remoteQuery) === needle
  if (remoteMatches) for (const item of remote.data?.items ?? []) {
    const key = nameKey(item.name)
    if (!unique.has(key)) unique.set(key, { ...item, origin: 'openfoodfacts' })
  }
  const matches = [...unique.values()].sort((a, b) => Number(nameKey(b.name).startsWith(needle)) - Number(nameKey(a.name).startsWith(needle)))
  const visible = !needle && !showAll ? matches.slice(0, 20) : matches
  const alreadyAdded = (name: string) => ingredients.some((item) => nameKey(item.name) === nameKey(name))
  const canAdd = ingredients.length < 100
  const customName = search.trim().replace(/\s+/g, ' ')
  function add(food: FoodSuggestion) {
    const indexes = ingredients.flatMap((item, index) => nameKey(item.name) === nameKey(food.name) ? [index] : [])
    setSessionFoods((previous) => previous.some((item) => nameKey(item.name) === nameKey(food.name)) ? previous : [...previous, food])
    if (indexes.length) {
      onRemove(food, indexes)
      setAnnouncement(`Retiré : ${food.name}. Touche + pour le remettre.`)
      return
    }
    if (!canAdd) return
    onAdd(food)
    setSearch('')
    setAnnouncement(`Ajouté : ${food.name}. Tu peux continuer ou revenir à la recette.`)
  }
  return createPortal(<HouseholdDialog title="Ajouter des ingrédients" fixedLayout onClose={onClose}>
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="shrink-0 text-sm leading-relaxed text-muted">Touche + pour ajouter, ou ✓ pour retirer. Les quantités se renseignent dans la recette.</p>
      <label className="grid shrink-0 gap-1"><span className="sr-only">Rechercher un ingrédient</span><input ref={searchInput} type="search" maxLength={100} autoComplete="off" value={search} onChange={(event) => { setSearch(event.target.value); setAnnouncement('') }} onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault() }} placeholder="Tomates, riz, mozzarella…" className="min-h-12 w-full rounded-[14px] border bg-surface px-3 text-base" /></label>
      <div className="min-h-16 flex-1 overflow-y-auto overscroll-contain rounded-xl px-1 pb-1">
        <p className="mb-3 text-xs font-semibold text-muted">{needle ? `${matches.length} résultat${matches.length > 1 ? 's' : ''}` : 'Vos aliments et les essentiels'}</p>
        <div className="grid gap-2">{visible.map((food) => {
          const added = alreadyAdded(food.name)
          return <button key={nameKey(food.name)} type="button" disabled={!added && !canAdd} aria-pressed={added} onPointerDown={(event) => { if (document.activeElement === searchInput.current) event.preventDefault() }} onClick={() => add(food)} aria-label={added ? `Retirer ${food.name}` : `Ajouter ${food.name}`} className={`flex min-h-20 w-full items-center gap-3 rounded-[18px] border p-2 text-left disabled:cursor-default ${added ? 'border-positive/25 bg-pastel-sage' : 'bg-bg hover:border-positive/40'}`}>
            <IngredientIllustration name={food.name} className="h-14 w-14" />
            <span className="min-w-0 flex-1"><span className="block break-words text-sm font-bold">{food.name}</span><span className="mt-1 block text-xs text-muted">{added ? 'Dans la recette · Toucher pour retirer' : food.origin === 'personal' ? 'Dans votre cuisine' : food.origin === 'openfoodfacts' ? 'Open Food Facts' : 'Aliment courant'}</span></span>
            <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${added ? 'bg-positive text-white' : 'bg-surface text-positive'}`}>{added ? '✓' : <PlusIcon size={20} />}</span>
          </button>
        })}</div>
        {!needle && !showAll && matches.length > visible.length && <Button type="button" variant="secondary" onClick={() => setShowAll(true)} className="mt-3 w-full">Voir tous les aliments</Button>}
        {needle && !matches.length && <p className="py-3 text-sm text-muted">Cet aliment n’est pas encore dans les suggestions. Tu peux l’ajouter avec ton propre nom.</p>}
        {customName && !alreadyAdded(customName) && !matches.some((food) => nameKey(food.name) === needle || food.aliases?.some((alias) => nameKey(alias) === needle)) && <Button type="button" variant="secondary" disabled={!canAdd} onPointerDown={(event) => { if (document.activeElement === searchInput.current) event.preventDefault() }} onClick={() => add({ name: customName, reference: null })} className="mt-3 h-auto! min-h-12 w-full py-3"><PlusIcon size={18} /><span className="min-w-0 break-words">Ajouter « {customName} »</span></Button>}
        {customName.length >= 2 && customName.length <= 60 && <Button type="button" variant="secondary" isLoading={remote.isFetching} className="mt-3 w-full" onClick={() => { setRemoteQuery(customName); if (remoteQuery === customName) void remote.refetch() }}>Chercher dans Open Food Facts</Button>}
        {remoteMatches && (remote.isError || remote.data?.available === false) && <p role="status" className="mt-3 text-xs text-muted">Open Food Facts est indisponible. Les suggestions locales et la saisie libre restent disponibles.</p>}
        {remoteMatches && remote.data && <a className="mt-3 block min-h-11 py-3 text-xs text-muted underline" href="https://world.openfoodfacts.org/terms-of-use" target="_blank" rel="noreferrer">Suggestions Open Food Facts · ODbL</a>}
      </div>
      {!canAdd && <p role="status" className="shrink-0 text-xs text-muted">La limite de 100 ingrédients est atteinte. Tu peux modifier les quantités dans la recette.</p>}
      <p role="status" aria-live="polite" className="shrink-0 text-xs leading-relaxed text-positive">{announcement || `${ingredients.length} ingrédient${ingredients.length > 1 ? 's' : ''} dans la recette`}</p>
      <Button type="button" onClick={onClose} className="shrink-0">{ingredients.length ? `Terminer · ${ingredients.length} ingrédient${ingredients.length > 1 ? 's' : ''}` : 'Revenir à la recette'}</Button>
    </div>
  </HouseholdDialog>, document.body)
}

