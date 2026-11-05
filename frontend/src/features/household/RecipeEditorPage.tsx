import { useRef } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeftIcon } from '../../components/icons'
import { useToastStore } from '../../lib/stores'
import { useHousehold } from './household'
import { HouseholdStatus } from './MealsPage'
import { RecipeForm } from './RecipeForm'

export function RecipeEditorPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToastStore((state) => state.show)
  const household = useHousehold()
  const requestedReturn = params.get('returnTo') ?? ''
  const back = /^\/meals(?:\?|$)/.test(requestedReturn) || /^\/meals\/choose(?:\?|$)/.test(requestedReturn) ? requestedReturn : '/meals'
  const savedId = useRef<string | null>(null)
  function close() {
    if (savedId.current && back.startsWith('/meals/choose')) {
      const next = new URL(back, window.location.origin); next.searchParams.set('picked', savedId.current)
      navigate(next.pathname + next.search, { replace: true })
    } else navigate(back, { replace: true })
  }
  const recipe = id ? household.data?.recipes.find((entry) => entry.id === id) : undefined
  const unavailable = !!household.data && !!id && (!recipe || recipe.source !== 'personal')
  return <main className="pb-5"><header className="sticky top-0 z-10 mb-4 flex items-center gap-3 bg-bg/95 py-2 backdrop-blur"><Link to={back} replace aria-label="Revenir sans enregistrer la recette" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface"><ChevronLeftIcon size={22} /></Link><h1 className="text-xl font-extrabold">{id ? 'Modifier la recette' : 'Créer une recette'}</h1></header>
    <HouseholdStatus loading={household.isPending} error={household.isError && !household.data} retry={() => void household.refetch()} />
    {unavailable && <p role="alert" className="rounded-xl bg-surface p-4 text-sm">Cette recette ne peut pas être modifiée. Reviens au planning pour en choisir une autre.</p>}
    {household.data && !unavailable && <RecipeForm key={id ?? 'new'} recipe={recipe} onClose={close} onSave={async (payload) => {
      await household.send('recipe.save', payload)
      toast(id ? 'Recette mise à jour' : 'Recette enregistrée', 'success')
      savedId.current = String(payload.id)
    }} />}
  </main>
}
