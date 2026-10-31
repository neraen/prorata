import { initialOf, paletteFor } from '../../lib/utils'

type AvatarSize = 26 | 32 | 36

interface AvatarProps {
  name: string
  /** The signed-in member wears the blue palette, the partner the orange one. */
  isSelf: boolean
  size?: AvatarSize
  /** Filled variant: the palette colour as background, white initial. */
  solid?: boolean
  /** 2px ring in the page background, for the overlapped pair in the header. */
  ringed?: boolean
  className?: string
}

const fontSize: Record<AvatarSize, string> = {
  26: 'text-[12px]',
  32: 'text-[13px]',
  36: 'text-[14px]',
}

export function Avatar({
  name,
  isSelf,
  size = 32,
  solid = false,
  ringed = false,
  className = '',
}: AvatarProps) {
  const palette = paletteFor(isSelf)

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${fontSize[size]} ${
        solid ? `${palette.solid} text-white` : `${palette.tint} ${palette.text}`
      } ${ringed ? 'border-2 border-bg' : ''} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {initialOf(name)}
    </span>
  )
}

interface AvatarPairProps {
  selfName: string
  partnerName: string
}

/** The two members as overlapping discs, as in the Accueil header. */
export function AvatarPair({ selfName, partnerName }: AvatarPairProps) {
  return (
    <div className="flex items-center">
      <Avatar name={selfName} isSelf size={36} ringed />
      <Avatar name={partnerName} isSelf={false} size={36} ringed className="-ml-[10px]" />
    </div>
  )
}
