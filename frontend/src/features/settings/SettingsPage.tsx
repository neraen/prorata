import { useState, useEffect } from 'react'
import { useAuthStore, useCoupleStore, useToastStore } from '../../lib/stores'
import type { CoupleSettings } from '../../lib/types'
import { Card, Button, Input, SegmentedControl } from '../../components/ui'

type Mode = 'income' | 'percentage' | 'equal'

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: 'income', label: 'Revenus' },
  { value: 'percentage', label: '%' },
  { value: 'equal', label: '50/50' },
]

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { couple, partner, updateSettings } = useCoupleStore()
  const showToast = useToastStore((s) => s.show)

  const [mode, setMode] = useState<Mode>('equal')
  const [incomeA, setIncomeA] = useState('')
  const [incomeB, setIncomeB] = useState('')
  const [percentageA, setPercentageA] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (couple && user) {
      setMode(couple.mode)

      // Find current user member and partner member
      const memberA = couple.members.find(m => m.userId === user.id)
      const memberB = couple.members.find(m => m.userId !== user.id)

      if (memberA?.incomeCents) {
        setIncomeA((memberA.incomeCents / 100).toString())
      }
      if (memberB?.incomeCents) {
        setIncomeB((memberB.incomeCents / 100).toString())
      }
      if (memberA?.percentage !== null && memberA?.percentage !== undefined) {
        setPercentageA(memberA.percentage.toString())
      } else {
        setPercentageA('50')
      }
    }
  }, [couple, user])

  if (!couple || !user || !partner) return null

  const computePreview = (): string => {
    switch (mode) {
      case 'income': {
        const a = Number(incomeA) || 0
        const b = Number(incomeB) || 0
        const total = a + b
        if (total === 0) return '50% / 50%'
        const pctA = Math.round((a / total) * 100)
        return `${pctA}% / ${100 - pctA}%`
      }
      case 'percentage': {
        const pctA = Number(percentageA) || 50
        return `${pctA}% / ${100 - pctA}%`
      }
      case 'equal':
      default:
        return '50% / 50%'
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const settings: CoupleSettings = { mode }
      if (mode === 'income') {
        settings.incomeA = Number(incomeA) || 0
        settings.incomeB = Number(incomeB) || 0
      } else if (mode === 'percentage') {
        settings.percentageA = Number(percentageA) || 50
        settings.percentageB = 100 - (Number(percentageA) || 50)
      }
      await updateSettings(settings)
      showToast('Paramètres enregistrés', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text">Réglages</h1>

      {/* Mode de répartition */}
      <Card>
        <p className="font-semibold text-text mb-4">Mode de répartition</p>
        <SegmentedControl
          options={MODE_OPTIONS}
          value={mode}
          onChange={setMode}
        />

        {mode === 'income' && (
          <div className="mt-4 space-y-3">
            <Input
              label={`Revenu de ${user.name} (€)`}
              type="number"
              min="0"
              value={incomeA}
              onChange={(e) => setIncomeA(e.target.value)}
            />
            <Input
              label={`Revenu de ${partner.name} (€)`}
              type="number"
              min="0"
              value={incomeB}
              onChange={(e) => setIncomeB(e.target.value)}
            />
          </div>
        )}

        {mode === 'percentage' && (
          <div className="mt-4">
            <Input
              label={`Part de ${user.name} (%)`}
              type="number"
              min="0"
              max="100"
              value={percentageA}
              onChange={(e) => setPercentageA(e.target.value)}
            />
            <p className="text-sm text-text-muted mt-2">
              Part de {partner.name}: {100 - (Number(percentageA) || 0)}%
            </p>
          </div>
        )}

        <div className="mt-4 p-3 rounded-[12px] bg-accent/10">
          <p className="text-sm text-text-muted">Répartition:</p>
          <p className="font-semibold text-accent">{computePreview()}</p>
        </div>

        <Button
          onClick={handleSave}
          isLoading={isSaving}
          className="w-full mt-4"
        >
          Enregistrer
        </Button>
      </Card>

      {/* Couple info */}
      <Card>
        <p className="font-semibold text-text mb-3">Votre couple</p>
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-text-muted">Vous:</span>{' '}
            <span className="font-medium">{user.name}</span>
          </p>
          <p>
            <span className="text-text-muted">Partenaire:</span>{' '}
            <span className="font-medium">{partner.name}</span>
          </p>
        </div>
      </Card>

      {/* Déconnexion */}
      <Button variant="secondary" onClick={handleLogout} className="w-full">
        Se déconnecter
      </Button>
    </div>
  )
}