import { CATEGORY_ICON_COMPONENTS } from '../icons'
import { categoryColors } from '../../lib/utils'

interface CategoryTileProps {
  category: string
  /** 44px in lists, kept a prop for the denser rows. */
  size?: number
}

/** Rounded square holding a category glyph, as in every expense row. */
export function CategoryTile({ category, size = 44 }: CategoryTileProps) {
  const colors = categoryColors(category)
  const Glyph =
    CATEGORY_ICON_COMPONENTS[category as keyof typeof CATEGORY_ICON_COMPONENTS] ??
    CATEGORY_ICON_COMPONENTS.other

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-[14px] ${colors.tile} ${colors.glyph}`}
      style={{ width: size, height: size }}
    >
      <Glyph size={Math.round(size / 2)} />
    </span>
  )
}
