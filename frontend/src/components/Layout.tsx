import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ArrowLeftRightIcon,
  HomeIcon,
  ListIcon,
  PlusIcon,
  SlidersIcon,
} from './icons'

/**
 * The five destinations of the bottom bar. « Historique » and « Perso » are
 * deliberately absent: the month selector replaces the former, and personal
 * expenses are reached from Réglages and created from the Commune/Perso
 * segment of the add screen.
 */
const navItems = [
  { to: '/', label: 'Accueil', Icon: HomeIcon },
  { to: '/expenses', label: 'Dépenses', Icon: ListIcon },
  { to: '/transfers', label: 'Virements', Icon: ArrowLeftRightIcon },
  { to: '/settings', label: 'Réglages', Icon: SlidersIcon },
]

export function Layout() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg">
      {/* Mobile-first column: 390px of reference, centred past 480px. */}
      <main className="mx-auto w-full max-w-[480px] px-5 pt-5 pb-[120px]">
        <Outlet />
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface">
        <div className="mx-auto flex h-[88px] w-full max-w-[480px] items-start justify-around pt-2">
          {navItems.slice(0, 2).map((item) => (
            <TabItem key={item.to} {...item} />
          ))}

          <button
            type="button"
            onClick={() => navigate('/expenses/new')}
            aria-label="Ajouter une dépense"
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-[18px] bg-ink text-white shadow-fab"
          >
            <PlusIcon size={26} />
          </button>

          {navItems.slice(2).map((item) => (
            <TabItem key={item.to} {...item} />
          ))}
        </div>
      </nav>
    </div>
  )
}

interface TabItemProps {
  to: string
  label: string
  Icon: (props: { size?: number }) => React.ReactElement
}

function TabItem({ to, label, Icon }: TabItemProps) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex h-[52px] w-16 flex-col items-center justify-center gap-1 text-[11px] ${
          isActive ? 'font-bold text-ink' : 'font-semibold text-nav-inactive'
        }`
      }
    >
      <Icon size={24} />
      {label}
    </NavLink>
  )
}

/**
 * Full-screen shell for the screens that take over the viewport — the add /
 * edit expense flow, which has its own close button instead of the tab bar.
 */
export function FullScreenLayout() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto w-full max-w-[480px] px-5 pt-4 pb-5">
        <Outlet />
      </div>
    </div>
  )
}
