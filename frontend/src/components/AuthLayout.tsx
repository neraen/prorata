import { Link, useLocation } from 'react-router-dom'

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const location = useLocation()
  const isLogin = location.pathname === '/login'

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="mx-auto flex h-16 w-full max-w-[480px] items-center justify-between px-5">
        <Link to="/login" className="text-[22px] font-extrabold tracking-[-0.03em] text-ink">
          Prorata
        </Link>
        <nav className="flex gap-1 rounded-[14px] bg-segment-bg p-1">
          <Link
            to="/login"
            className={`flex h-10 items-center rounded-[11px] px-4 text-[14px] ${
              isLogin ? 'bg-surface font-bold text-ink shadow-segment' : 'font-semibold text-muted'
            }`}
          >
            Connexion
          </Link>
          <Link
            to="/register"
            className={`flex h-10 items-center rounded-[11px] px-4 text-[14px] ${
              !isLogin ? 'bg-surface font-bold text-ink shadow-segment' : 'font-semibold text-muted'
            }`}
          >
            Inscription
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-[480px] flex-1 items-center justify-center px-5 pb-10">
        {children}
      </main>
    </div>
  )
}
