import { Link, useLocation } from 'react-router-dom'

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const location = useLocation()
  const isLogin = location.pathname === '/login'

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4">
        <Link to="/login" className="text-xl font-bold text-accent">
          Prorata
        </Link>
        <nav className="flex gap-2">
          <Link
            to="/login"
            className={`
              px-4 py-2 rounded-[12px] text-sm font-medium transition-colors
              ${isLogin ? 'bg-accent text-white' : 'text-text-muted hover:text-text'}
            `}
          >
            Connexion
          </Link>
          <Link
            to="/register"
            className={`
              px-4 py-2 rounded-[12px] text-sm font-medium transition-colors
              ${!isLogin ? 'bg-accent text-white' : 'text-text-muted hover:text-text'}
            `}
          >
            Inscription
          </Link>
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
    </div>
  )
}