import type { Recipe } from './household'
import { foldFood } from './foodCatalog'

const THEMES = ['pasta', 'bowl', 'skillet', 'oven', 'soup', 'quick'] as const
function recipeIllustration(recipe?: Pick<Recipe, 'title' | 'illustration'> | null) {
  if (recipe?.illustration && THEMES.includes(recipe.illustration as typeof THEMES[number])) return recipe.illustration
  const title = foldFood(recipe?.title ?? '')
  if (/soupe|veloute|potage/.test(title)) return 'soup'
  if (/pate|spaghetti|penne|macaroni/.test(title)) return 'pasta'
  if (/gratin|quiche|four|roti/.test(title)) return 'oven'
  if (/omelette|poele|oeuf|gnocchi/.test(title)) return 'skillet'
  if (/pizza|wrap|burger|croque|sandwich/.test(title)) return 'quick'
  return 'bowl'
}
/** Decorative family illustration: the recipe text remains the source of ingredient information. */
export function RecipeIllustration({ recipe, className = '', eager = false }: { recipe?: Pick<Recipe, 'title' | 'illustration'> | null; className?: string; eager?: boolean }) {
  return <img src={`/illustrations/recipe-${recipeIllustration(recipe)}.webp`} alt="" aria-hidden="true" width={640} height={640} loading={eager ? 'eager' : 'lazy'} decoding="async" className={`bg-[#F5F5F1] object-contain ${className}`} />
}
