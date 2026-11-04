import { Link } from 'react-router-dom'
import { useAuthStore } from '../lib/stores'

export function AccountLink() {
  const name = useAuthStore((state) => state.user?.name ?? '')
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase()
  return <Link to="/profile" aria-label="Mon compte" title="Mon compte" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white bg-pastel-lilac text-sm font-extrabold text-ink shadow-card"><span aria-hidden="true">{initials || 'Moi'}</span></Link>
}
