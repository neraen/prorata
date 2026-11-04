import { AccountLink } from './AccountLink'
import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CartIcon, HomeIcon, ListIcon, MealIcon, StatsIcon } from './icons'

const navItems = [
  { to: '/', label: 'Accueil', tone: 'bg-pastel-sage', Icon: HomeIcon },
  { to: '/meals', label: 'Repas', tone: 'bg-pastel-peach', Icon: MealIcon },
  { to: '/shopping', label: 'Courses', tone: 'bg-pastel-sage', Icon: CartIcon },
  { to: '/budget', label: 'Budget', tone: 'bg-pastel-lilac', Icon: ListIcon },
  { to: '/stats', label: 'Bilan', tone: 'bg-pastel-blue', Icon: StatsIcon },
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
    <main ref={main} id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[480px] px-5 pt-6 pb-[140px]">
      {!['/', '/profile', '/budget'].includes(pathname) && <div className="mb-3 flex justify-end"><AccountLink /></div>}
      {inBudget && pathname !== '/budget' && <nav aria-label="Navigation budget" className="mb-5 flex flex-wrap gap-2">{[['/budget', 'Vue d’ensemble'], ['/expenses', 'Dépenses'], ['/transfers', 'Virements'], ['/personal', 'Personnel'], ['/settings', 'Réglages']].map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => `flex min-h-11 shrink-0 items-center rounded-full border px-4 text-xs font-bold ${isActive ? 'bg-ink text-white' : 'bg-surface'}`}>{label}</NavLink>)}</nav>}
      <Outlet />
    </main>
    <nav aria-label="Navigation principale" className="safe-bottom fixed inset-x-3 bottom-3 z-30 mx-auto max-w-[480px] rounded-[28px] border border-white/80 bg-surface/95 px-1 shadow-[0_12px_36px_rgba(38,61,52,0.14)] backdrop-blur-xl"><div className="mx-auto flex h-[76px] w-full max-w-[480px] items-start justify-around pt-2">{navItems.map(({ to, label, Icon, tone }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex h-[58px] w-16 flex-col items-center justify-center gap-1 rounded-[20px] transition-colors text-xs ${isActive || (to === '/budget' && inBudget) ? `${tone} font-bold text-ink` : 'font-semibold text-nav-inactive'}`}><Icon size={23} />{label}</NavLink>)}</div></nav>
  </div>
}
export function FullScreenLayout() {
  return <div className="min-h-screen bg-bg"><div className="mx-auto w-full max-w-[480px] px-5 pt-4 pb-5"><Outlet /></div></div>
}
