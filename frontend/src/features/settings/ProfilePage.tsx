import { Link } from 'react-router-dom'
import { Avatar, Button, Card } from '../../components/ui'
import { ChevronRightIcon } from '../../components/icons'
import { useAuthStore, useCoupleStore } from '../../lib/stores'
import { PersonalTasksCard } from './PersonalTasksCard'

export function ProfilePage() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const partner = useCoupleStore((state) => state.partner)
  if (!user) return null
  return <div className="grid gap-5">
    <header><p className="mb-1 text-xs font-semibold text-muted">Ton espace à toi</p><h1 className="text-[28px] font-extrabold tracking-tight">Mon compte</h1></header>
    <Card className="flex items-center gap-4 bg-pastel-lilac!"><Avatar name={user.name} isSelf size={36} /><div className="min-w-0"><h2 className="text-lg font-bold break-words">{user.name}</h2><p className="mt-1 text-sm text-muted break-words">{user.email}</p>{partner && <p className="mt-2 text-xs font-semibold">Le quotidien avec {partner.name}</p>}</div></Card>
    <PersonalTasksCard />
    <Card className="grid gap-1"><h2 className="mb-2 font-extrabold">Mes raccourcis</h2>{[['/personal', 'Mes dépenses personnelles'], ['/meals/preferences', 'Goûts, allergies et équipement'], ['/meals/stock', 'Notre frigo et nos placards'], ['/settings', 'Répartition du budget']].map(([to, label]) => <Link key={to} to={to} className="flex min-h-12 items-center justify-between gap-3 border-b border-border py-2 text-sm font-semibold last:border-0">{label}<ChevronRightIcon size={18} className="shrink-0" /></Link>)}</Card>
    <Button variant="danger" onClick={async () => { await logout(); window.location.href = '/login' }}>Se déconnecter</Button>
  </div>
}
