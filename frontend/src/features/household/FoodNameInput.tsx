import { useId, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api'
import { useAuthStore, useCoupleStore } from '../../lib/stores'
import type { FoodReference, Household } from './household'
import { COMMON_FOODS, foldFood, type FoodSuggestion } from './foodCatalog'

export function FoodNameInput({ value, onChange, label, placeholder = 'Un aliment…', required = true }: { value: string; onChange: (name: string, reference: FoodReference | null) => void; label: string; placeholder?: string; required?: boolean }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [remoteQuery, setRemoteQuery] = useState('')
  const queryClient = useQueryClient()
  const coupleId = useCoupleStore((s) => s.couple?.id)
  const userId = useAuthStore((s) => s.user?.id)
  const household = queryClient.getQueryData<Household>(['household', coupleId, userId])
  const remote = useQuery({ queryKey: ['foodSuggestions', foldFood(remoteQuery)], queryFn: () => apiFetch<{ items: FoodSuggestion[]; available: boolean }>(`/foods/suggestions?q=${encodeURIComponent(remoteQuery)}`), enabled: remoteQuery.length >= 2, staleTime: 604800000, retry: false })
  const own = [...(household?.foodProfile?.pantry ?? []), ...(household?.recipes.flatMap((r) => r.ingredients) ?? [])].map((i): FoodSuggestion => ({ name: i.name, reference: i.reference ?? null, origin: 'personal' }))
  const needle = foldFood(value)
  const unique = new Map<string, FoodSuggestion>()
  for (const item of [...own, ...COMMON_FOODS]) {
    const key = foldFood(item.name)
    if ((!needle || key.includes(needle)) && !unique.has(key)) unique.set(key, item)
  }
  if (foldFood(remoteQuery) === needle) for (const item of remote.data?.items ?? []) unique.set(foldFood(item.name), { ...item, origin: 'openfoodfacts' })
  const suggestions = [...unique.values()].sort((a, b) => Number(foldFood(b.name).startsWith(needle)) - Number(foldFood(a.name).startsWith(needle))).slice(0, 8)
  function select(item: FoodSuggestion) { onChange(item.name, item.reference); setOpen(false); setActive(-1) }
  const canSearch = value.trim().length >= 2 && value.trim().length <= 60
  return <div className="relative w-full">
    <input aria-label={label} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-options`} aria-activedescendant={open && active >= 0 && suggestions[active] ? `${id}-${active}` : undefined} required={required} maxLength={100} autoComplete="off" value={value} placeholder={placeholder} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onChange={(e) => { onChange(e.target.value, null); setOpen(true); setActive(-1) }} onKeyDown={(e) => {
      if (e.key === 'ArrowDown' && suggestions.length) { e.preventDefault(); setOpen(true); setActive((n) => (n + 1) % suggestions.length) }
      if (e.key === 'ArrowUp' && suggestions.length) { e.preventDefault(); setActive((n) => (n - 1 + suggestions.length) % suggestions.length) }
      if (e.key === 'Enter' && open && active >= 0 && suggestions[active]) { e.preventDefault(); select(suggestions[active]) }
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
    }} className="min-h-12 w-full rounded-[14px] border border-border bg-surface px-3 text-[14px] text-ink" />
    {open && <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-[16px] border bg-surface p-2 shadow-lg" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => { if ((e.target as HTMLElement).closest('button')) e.preventDefault() }}>
      <ul id={`${id}-options`} role="listbox" aria-label="Suggestions d’aliments">{suggestions.map((item, index) => <li key={foldFood(item.name)} role="option" aria-selected={index === active} id={`${id}-${index}`}><button type="button" onClick={() => select(item)} className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-2 text-left text-sm ${index === active ? 'bg-positive-bg' : ''}`}><span>{item.name}</span><span className="shrink-0 text-[10px] text-muted">{item.origin === 'openfoodfacts' ? 'Open Food Facts' : item.origin === 'personal' ? 'Vos aliments' : 'Courant'}</span></button></li>)}</ul>
      {suggestions.length === 0 && <p className="p-2 text-xs text-muted">Tu peux garder ce nom librement.</p>}
      {canSearch && <button type="button" disabled={remote.isFetching} onClick={() => { setRemoteQuery(value.trim()); if (remoteQuery === value.trim()) void remote.refetch() }} className="min-h-11 w-full rounded-xl bg-positive-bg px-2 text-xs font-bold text-positive">{remote.isFetching ? 'Recherche…' : 'Chercher dans Open Food Facts'}</button>}
      {foldFood(remoteQuery) === needle && (remote.isError || remote.data?.available === false) && <p role="status" className="p-2 text-xs text-muted">Open Food Facts est indisponible. La saisie libre reste disponible.</p>}
      {remote.data && foldFood(remoteQuery) === needle && <a href="https://world.openfoodfacts.org/terms-of-use" target="_blank" rel="noreferrer" className="block p-2 text-[10px] text-muted underline">Suggestions Open Food Facts · ODbL</a>}
    </div>}
  </div>
}
