import { useId, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui'
import { formatMoney } from '../../lib/utils'
import { MEAL_CATEGORIES } from './assistant'
import { foldFood } from './foodCatalog'
import type { Recipe } from './household'
import { RecipeIllustration } from './RecipeIllustration'
import { fieldClass } from './RecipeForm'

/** Native radios keep the recipe bank usable with touch, keyboard and screen readers. */
export function MealRecipePicker({ recipes, selected, onSelect, disabled, pageLayout = false, unavailable = [] }: { recipes: Recipe[]; selected: string; onSelect: (id: string) => void; disabled: boolean; pageLayout?: boolean; unavailable?: string[] }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const group = useId()
  const bank = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (pageLayout) return
    const list = bank.current
    const row = list?.querySelector<HTMLInputElement>('input:checked')?.closest('label')
    if (!list || !row) return
    const item = row.getBoundingClientRect(); const bounds = list.getBoundingClientRect()
    if (item.top < bounds.top || item.bottom > bounds.bottom) list.scrollTop += item.top - bounds.top
  }, [selected, search, category, pageLayout])
  const visible = recipes.filter((recipe) => foldFood(recipe.title).includes(foldFood(search.trim())) && (category === 'all' || recipe.category === category))
  return <div className={`flex min-w-0 flex-col gap-2 ${pageLayout ? '' : 'min-h-72 flex-1'}`}>
    <p className="shrink-0 text-sm font-bold">Choisir le plat</p>
    <label className="grid shrink-0 gap-1"><span className="sr-only">Rechercher un plat pour ce repas</span><input disabled={disabled} className={fieldClass} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un plat…" /></label>
    <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto pb-1" aria-label="Types de plats">{[['all', 'Tous'], ...Object.entries(MEAL_CATEGORIES)].map(([value, label]) => <button key={value} disabled={disabled} type="button" aria-pressed={category === value} onClick={() => setCategory(value)} className={`min-h-11 shrink-0 rounded-full px-3 text-xs font-bold ${category === value ? 'bg-ink text-white' : 'border bg-bg'}`}>{label}</button>)}</div>
    <p role="status" className="shrink-0 text-xs text-muted">{visible.length} plat{visible.length > 1 ? 's' : ''} · Un choix pour ce plat</p>
    <div ref={bank} className={`rounded-2xl p-1 ${pageLayout ? '' : 'min-h-20 flex-1 overflow-y-auto overscroll-contain'}`} role="radiogroup" aria-label="Banque de recettes">
      <div className="grid gap-2">{visible.map((recipe) => <label key={recipe.id} className={`relative flex cursor-pointer items-center gap-3 rounded-[18px] border-2 p-2 transition-colors ${selected === recipe.id ? 'border-positive bg-pastel-sage' : 'border-transparent bg-bg'}`}>
        <input className="peer h-5 w-5 shrink-0 accent-positive" disabled={disabled || unavailable.includes(recipe.id)} type="radio" name={group} value={recipe.id} checked={selected === recipe.id} onChange={() => onSelect(recipe.id)} />
        <RecipeIllustration recipe={recipe} showLabel={false} className="h-20 w-20 shrink-0 rounded-xl" />
        <span className="grid min-w-0 flex-1 gap-1"><span className="text-sm font-bold leading-snug">{recipe.title}</span><span className="text-xs text-muted">{recipe.minutes} min{recipe.category ? ` · ${MEAL_CATEGORIES[recipe.category]}` : ''}</span><span className="text-xs font-semibold">{recipe.estimatedCostCents == null ? 'Prix non renseigné' : `≈ ${formatMoney(Math.round(recipe.estimatedCostCents / recipe.servings))} / portion`}</span>{unavailable.includes(recipe.id) && <span className="text-xs text-muted">Déjà choisi pour l’autre plat</span>}</span>
      </label>)}</div>
      {!visible.length && <div className="grid gap-3 p-3"><p className="text-sm text-muted">Aucun plat ne correspond à ces choix.</p><Button disabled={disabled} variant="secondary" onClick={() => { setSearch(''); setCategory('all') }}>Voir tous les plats</Button></div>}
    </div>
    <p className="shrink-0 text-[11px] leading-relaxed text-muted">Prix indicatifs, selon l’estimation enregistrée. Le carnet et l’assiette vide sont des visuels génériques.</p>
    {selected && !visible.some((recipe) => recipe.id === selected) && <p className="rounded-xl bg-pastel-sage p-3 text-xs">Choix conservé : <strong>{recipes.find((recipe) => recipe.id === selected)?.title}</strong>. Efface les filtres pour le retrouver.</p>}
  </div>
}
