import type { SVGProps } from 'react'

/**
 * The icon set of the redesign, traced from the handoff mockups.
 *
 * Every path below is copied verbatim from `screens/*.html`, so the drawing in
 * the app and the drawing in the mockup are the same geometry. Lucide names are
 * kept so the set can be swapped for `lucide-react` later without renaming
 * call sites.
 *
 * `size` is the viewport of the glyph; stroke width is 2 in navigation and 1.8
 * for category glyphs, which is why it stays a prop rather than a constant.
 */
interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height' | 'strokeWidth'> {
  size?: number
  strokeWidth?: number
}

function Icon({ size = 24, strokeWidth = 2, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

/* ---------- Navigation ---------- */

export function HomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </Icon>
  )
}

export function ListIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </Icon>
  )
}

export function ArrowLeftRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 4l-4 4 4 4M3 8h14M17 20l4-4-4-4M21 16H7" />
    </Icon>
  )
}

export function SlidersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </Icon>
  )
}

export function PlusIcon({ strokeWidth = 2.4, ...props }: IconProps) {
  return (
    <Icon strokeWidth={strokeWidth} {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

/* ---------- Controls ---------- */

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 18l-6-6 6-6" />
    </Icon>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 18l6-6-6-6" />
    </Icon>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 9l6 6 6-6" />
    </Icon>
  )
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  )
}

export function CopyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </Icon>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Icon>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </Icon>
  )
}

export function BackspaceIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1zM17 9l-5 6M12 9l5 6" />
    </Icon>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
    </Icon>
  )
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Icon>
  )
}

/* ---------- Catégories ---------- */

export function CartIcon({ strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <Icon strokeWidth={strokeWidth} {...props}>
      <path d="M2 3h2.5l2.4 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.5L21.5 7H5.4" />
      <path d="M8 21a1 1 0 1 0 2 0a1 1 0 1 0-2 0M17 21a1 1 0 1 0 2 0a1 1 0 1 0-2 0" />
    </Icon>
  )
}

export function GamepadIcon({ strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <Icon strokeWidth={strokeWidth} {...props}>
      <path d="M17.3 5H6.7a4 4 0 0 0-4 3.6C2.6 9.4 2 14.5 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.4-1.4A2 2 0 0 1 9.8 16h4.4a2 2 0 0 1 1.4.6L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.5-.6-6.6-.7-7.3A4 4 0 0 0 17.3 5z" />
      <path d="M6 11h4M8 9v4" />
      <path d="M15 12h.01M18 10h.01" />
    </Icon>
  )
}

export function CarIcon({ strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <Icon strokeWidth={strokeWidth} {...props}>
      <path d="M19 17h2a1 1 0 0 0 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5a1.6 1.6 0 0 0-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4a1 1 0 0 0 1 1h2" />
      <path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0M15 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />
      <path d="M9 17h6" />
    </Icon>
  )
}

export function HouseIcon({ strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <Icon strokeWidth={strokeWidth} {...props}>
      <path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </Icon>
  )
}

export function PillIcon({ strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <Icon strokeWidth={strokeWidth} {...props}>
      <path d="M10.5 20.5l-7-7a5 5 0 1 1 7-7l7 7a5 5 0 1 1-7 7z" />
      <path d="M8.5 8.5l7 7" />
    </Icon>
  )
}

export function PackageIcon({ strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <Icon strokeWidth={strokeWidth} {...props}>
      <path d="M21 8l-9-5-9 5v8l9 5 9-5z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
    </Icon>
  )
}

/** Category key (as stored by the API) to its glyph. */
export const CATEGORY_ICON_COMPONENTS = {
  groceries: CartIcon,
  leisure: GamepadIcon,
  transport: CarIcon,
  housing: HouseIcon,
  health: PillIcon,
  other: PackageIcon,
} as const
