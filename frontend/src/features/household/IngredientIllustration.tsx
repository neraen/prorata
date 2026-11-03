import { PackageIcon } from '../../components/icons'
import { ingredientVisual } from './ingredientVisual'

export function IngredientIllustration({ name, className = 'h-12 w-12' }: { name: string; className?: string }) {
  const visual = ingredientVisual(name)
  return <span aria-hidden="true" className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F8F7F2] ${className}`}>
    {visual ? <img src={visual.src} alt="" width={160} height={160} loading="lazy" className="h-full w-full object-contain" /> : <PackageIcon size={24} className="text-muted" />}
  </span>
}
