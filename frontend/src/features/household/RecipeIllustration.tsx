import { recipeVisual, type RecipeVisualInput } from './recipeVisual'

export function RecipeIllustration({ recipe, className = '', eager = false, showLabel = true }: { recipe?: RecipeVisualInput | null; className?: string; eager?: boolean; showLabel?: boolean }) {
  const visual = recipeVisual(recipe)
  return <span className={`relative block overflow-hidden bg-[#F5F5F1] ${className}`}>
    <img src={visual.src} alt="" aria-hidden="true" width={640} height={640} loading={eager ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-contain" />
    {visual.generic && showLabel && <span className="absolute inset-x-2 bottom-2 rounded-lg bg-surface/95 px-2 py-1 text-center text-[11px] font-semibold text-muted">Visuel générique</span>}
  </span>
}
