import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, useCoupleStore, useToastStore } from '../../lib/stores'
import { Button, Input, Card } from '../../components/ui'

export function SetupPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { createCouple, invitePartner, joinCouple, couple, inviteToken } = useCoupleStore()
  const showToast = useToastStore((s) => s.show)

  const [inviteCode, setInviteCode] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  // Couple created, waiting for partner or showing invite form
  if (couple && couple.members.length === 1) {
    if (inviteToken) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md" padding="lg">
            <div className="text-center mb-8">
              <span className="text-5xl mb-4 block">🎉</span>
              <h1 className="text-2xl font-bold text-ink mb-2">Invitation envoyée !</h1>
              <p className="text-muted">
                Partagez ce code avec votre partenaire
              </p>
            </div>

            <div className="bg-surface-sunken rounded-[16px] p-6 text-center mb-6">
              <p className="text-sm text-muted mb-2">Code d'invitation</p>
              <p className="text-xl font-bold text-clement-text tracking-wider break-all">
                {inviteToken}
              </p>
            </div>

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(inviteToken)
                showToast('Code copié !', 'success')
              }}
            >
              Copier le code
            </Button>

            <p className="text-center text-muted text-sm mt-6">
              En attente de votre partenaire...
            </p>
          </Card>
        </div>
      )
    }

    // Show invite form
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md" padding="lg">
          <div className="text-center mb-8">
            <span className="text-5xl mb-4 block">💌</span>
            <h1 className="text-2xl font-bold text-ink mb-2">Inviter votre partenaire</h1>
            <p className="text-muted">
              Entrez l'email de votre partenaire pour l'inviter
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-[12px] bg-negative-bg text-negative text-sm text-center mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Email du partenaire"
              type="email"
              placeholder="partenaire@email.com"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
            />
            <Button
              onClick={async () => {
                if (!partnerEmail.trim()) {
                  setError("Entrez l'email de votre partenaire")
                  return
                }
                setIsInviting(true)
                setError(null)
                try {
                  await invitePartner(partnerEmail.trim())
                  showToast('Invitation créée !', 'success')
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Erreur')
                } finally {
                  setIsInviting(false)
                }
              }}
              isLoading={isInviting}
              className="w-full"
            >
              Créer l'invitation
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const handleCreate = async () => {
    setIsCreating(true)
    setError(null)
    try {
      await createCouple()
      // Component will re-render with couple state and show invite form
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError("Entrez un code d'invitation")
      return
    }
    setIsJoining(true)
    setError(null)
    try {
      await joinCouple(inviteCode.trim())
      showToast('Couple rejoint avec succès !', 'success')
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md" padding="lg">
        <div className="text-center mb-8">
          <span className="text-5xl mb-4 block">💑</span>
          <h1 className="text-2xl font-bold text-ink mb-2">
            Bonjour {user.name} !
          </h1>
          <p className="text-muted">
            Créez ou rejoignez un couple pour commencer
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-[12px] bg-negative-bg text-negative text-sm text-center mb-4">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <Button
              onClick={handleCreate}
              isLoading={isCreating}
              className="w-full"
            >
              Créer un couple
            </Button>
            <p className="text-center text-muted text-xs mt-2">
              Vous recevrez un code à partager
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-muted text-sm">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-3">
            <Input
              label="Code d'invitation"
              type="text"
              placeholder="Collez le code ici"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="text-center text-sm"
            />
            <Button
              variant="secondary"
              onClick={handleJoin}
              isLoading={isJoining}
              className="w-full"
            >
              Rejoindre
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
