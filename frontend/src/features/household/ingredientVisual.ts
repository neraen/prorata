import catalog from './ingredientCatalog.json'
import { foldFood } from './foodCatalog'
import type { Ingredient } from './household'

const entries = new Map(catalog.flatMap((item) => item.aliases.map((alias) => [foldFood(alias).replaceAll('’', "'"), item] as const)))
/** Exact, curated aliases; a fallback never pretends to depict an unknown item. */
export function ingredientVisual(name: string) {
  const item = entries.get(foldFood(name).replaceAll('’', "'"))
  return item ? { src: `/illustrations/ingredients/${item.id}.webp`, aisle: item.aisle as Ingredient['aisle'], unit: 'unit' in item ? item.unit as Ingredient['unit'] : undefined } : null
}
