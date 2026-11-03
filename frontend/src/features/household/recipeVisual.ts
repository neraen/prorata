export interface RecipeVisualInput {
  id?: string
  existingRecipeId?: string | null
  source?: 'app' | 'personal'
  title?: string
  illustration?: string
}
const DEDICATED_IMAGES = new Map([
  ['app-pasta', 'pasta'],
  ['app-curry', 'bowl'],
  ['app-omelette', 'skillet'],
])
/** Only explicitly assigned dish artwork may represent a recipe. Never infer it from the title. */
export function recipeVisual(recipe?: RecipeVisualInput | null) {
  if (recipe?.source === 'personal') return { src: '/illustrations/recipe-personal-placeholder.webp', generic: true, label: 'Recette personnelle · visuel générique' }
  const image = DEDICATED_IMAGES.get(recipe?.id ?? recipe?.existingRecipeId ?? '')
  if (image) return { src: `/illustrations/recipe-${image}.webp`, generic: false, label: 'Illustration du plat' }
  return { src: '/illustrations/recipe-missing-placeholder.webp', generic: true, label: 'Sans image du plat · visuel générique' }
}
