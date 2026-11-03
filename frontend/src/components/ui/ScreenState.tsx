import { ActionLink } from './ActionLink'
import { Button } from './Button'
import { Card } from './Card'
export function ScreenState({ title, loading, onRetry }: { title: string; loading: boolean; onRetry: () => void }) {
  return <div className="grid gap-5"><h1 className="text-[28px] font-extrabold tracking-tight">{title}</h1><Card className="grid gap-4"><p role={loading ? 'status' : 'alert'} className="text-sm leading-relaxed text-muted">{loading ? 'On prépare tes informations…' : 'Impossible de charger ces informations pour le moment. Réessaie, ou retrouve les autres fonctionnalités depuis l’accueil.'}</p>{loading ? <div aria-hidden="true" className="grid gap-3"><span className="h-5 w-2/3 rounded-lg bg-pastel-sage" /><span className="h-16 rounded-xl bg-bg" /></div> : <><Button onClick={onRetry}>Réessayer</Button><ActionLink secondary to="/">Retour à l’accueil</ActionLink></>}</Card></div>
}
