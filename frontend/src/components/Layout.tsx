import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/expenses', label: 'Dépenses', icon: '💳' },
  { to: '/personal', label: 'Perso', icon: '🙋' },
  { to: '/transfers', label: 'Virements', icon: '🏦' },
  { to: '/history', label: 'Historique', icon: '📅' },
  { to: '/settings', label: 'Réglages', icon: '⚙️' },
]

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between px-6 py-4 bg-surface border-b border-border">
        <h1 className="text-xl font-bold text-accent">Prorata</h1>
        <nav className="flex gap-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-[12px] text-sm font-medium transition-colors
                ${isActive ? 'bg-accent text-white' : 'text-text-muted hover:text-text hover:bg-background'}`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-24 md:pb-4 max-w-2xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border px-2 py-2 safe-bottom">
        <div className="flex justify-around">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-1 py-2 rounded-[12px] flex-1 min-w-0 transition-colors
                ${isActive ? 'text-accent' : 'text-text-muted'}`
              }
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] leading-tight truncate max-w-full">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}