import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CartIcon, HomeIcon, ListIcon, MealIcon, StatsIcon } from './icons'

const navItems = [
  { to: '/', label: 'Accueil', Icon: HomeIcon },
  { to: '/meals', label: 'Repas', Icon: MealIcon },
  { to: '/shopping', label: 'Courses', Icon: CartIcon },
  { to: '/budget', label: 'Budget', Icon: ListIcon },
  { to: '/stats', label: 'Stats', Icon: StatsIcon },
]
const budgetPaths = ['/budget', '/expenses', '/transfers', '/personal', '/settings']
export function Layout() {
  const { pathname } = useLocation()
  const main = useRef<HTMLElement>(null)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    main.current?.focus({ preventScroll: true })
  }, [pathname])
  const inBudget = budgetPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  return <div className="min-h-screen bg-bg">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-surface focus:p-3 focus:font-bold">Aller au contenu</a>
    <main ref={main} id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[480px] px-5 pt-5 pb-[120px]">
      {inBudget && pathname !== '/budget' && <nav aria-label="Navigation budget" className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">{[['/budget', 'Prorata'], ['/expenses', 'Dépenses'], ['/transfers', 'Virements'], ['/personal', 'Personnel'], ['/settings', 'Réglages']].map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => `flex min-h-11 shrink-0 items-center rounded-full border px-4 text-xs font-bold ${isActive ? 'bg-ink text-white' : 'bg-surface'}`}>{label}</NavLink>)}</nav>}
      <Outlet />
    </main>
    <nav aria-label="Navigation principale" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface"><div className="mx-auto flex h-[80px] w-full max-w-[480px] items-start justify-around pt-2">{navItems.map(({ to, label, Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex h-[58px] w-16 flex-col items-center justify-center gap-1 rounded-[14px] text-[11px] ${isActive || (to === '/budget' && inBudget) ? 'bg-positive-bg font-bold text-positive' : 'font-semibold text-nav-inactive'}`}><Icon size={23} />{label}</NavLink>)}</div></nav>
  </div>
}
export function FullScreenLayout() {
  return <div className="min-h-screen bg-bg"><div className="mx-auto w-full max-w-[480px] px-5 pt-4 pb-5"><Outlet /></div></div>
}
