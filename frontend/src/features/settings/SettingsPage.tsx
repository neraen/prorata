import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore, useCoupleStore, useToastStore } from '../../lib/stores'
import type { CoupleSettings } from '../../lib/types'
import { formatMoneyShort } from '../../lib/utils'
import { ChevronRightIcon } from '../../components/icons'
import { Avatar, Button, Card, SegmentedControl, SplitBar } from '../../components/ui'

type Mode = 'income' | 'percentage' | 'equal'

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: 'income', label: 'Revenus' },
  { value: 'percentage', label: 'Fixe en %' },
  { value: 'equal', label: '50 / 50' },
]

const MODE_HINTS: Record<Mode, string> = {
  income: 'Chacun paie selon ce qu’il gagne.',
  percentage: 'Vous fixez vous-mêmes les parts.',
  equal: 'Tout est coupé en deux.',
}

/** Digits only, displayed with the French thousands separator. */
function toDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function groupDigits(digits: string): string {
  return digits === '' ? '' : Number(digits).toLocaleString('fr-FR')
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { couple, partner, updateSettings } = useCoupleStore()
  const showToast = useToastStore((s) => s.show)

  const [mode, setMode] = useState<Mode>('equal')
  const [incomeSelf, setIncomeSelf] = useState('')
  const [incomePartner, setIncomePartner] = useState('')
  const [percentSelfInput, setPercentSelfInput] = useState('50')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!couple || !user) return

    setMode(couple.mode)

    const self = couple.members.find((m) => m.userId === user.id)
    const other = couple.members.find((m) => m.userId !== user.id)

    if (self?.incomeCents) setIncomeSelf(String(Math.round(self.incomeCents / 100)))
    if (other?.incomeCents) setIncomePartner(String(Math.round(other.incomeCents / 100)))
    setPercentSelfInput(String(self?.percentage ?? 50))
  }, [couple, user])

  if (!couple || !user || !partner) return null

  /** Share of the signed-in member, as the preview shows it. */
  const percentSelf = (() => {
    if (mode === 'equal') return 50
    if (mode === 'percentage') {
      const value = Number(percentSelfInput)
      return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 50
    }
    const a = Number(incomeSelf) || 0
    const b = Number(incomePartner) || 0
    return a + b === 0 ? 50 : Math.round((a / (a + b)) * 100)
  })()

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const settings: CoupleSettings = { mode }
      if (mode === 'income') {
        settings.incomeA = Number(incomeSelf) || 0
        settings.incomeB = Number(incomePartner) || 0
      } else if (mode === 'percentage') {
        settings.percentageA = percentSelf
        settings.percentageB = 100 - percentSelf
      }
      await updateSettings(settings)
      showToast('Réglages enregistrés', 'success')
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

  const incomeField = (
    person: { name: string },
    isSelf: boolean,
    value: string,
    onChange: (digits: string) => void
  ) => (
    <label className="flex h-[60px] items-center gap-3 rounded-[16px] border border-border bg-surface-sunken px-4">
      <Avatar name={person.name} isSelf={isSelf} size={32} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[12px] text-muted">Revenu net de {person.name}</span>
        <input
          type="text"
          inputMode="decimal"
          value={groupDigits(value)}
          onChange={(event) => onChange(toDigits(event.target.value))}
          className="w-full border-0 bg-transparent p-0 text-[17px] font-bold text-ink outline-none"
        />
      </span>
      <span className="shrink-0 text-[15px] font-semibold text-muted">€ / mois</span>
    </label>
  )

  return (
    <div className="flex flex-col gap-4">
      <h1 className="flex h-12 items-center text-[28px] font-extrabold tracking-[-0.03em]">
        Réglages
      </h1>

      {/* Répartition */}
      <Card radius="xl" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-[17px] font-bold">Répartition des dépenses</div>
          <div className="text-[13px] leading-relaxed text-muted">{MODE_HINTS[mode]}</div>
        </div>

        <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} tone="alt" />

        {mode === 'income' && (
          <>
            {incomeField(user, true, incomeSelf, setIncomeSelf)}
            {incomeField(partner, false, incomePartner, setIncomePartner)}
          </>
        )}

        {mode === 'percentage' && (
          <label className="flex h-[60px] items-center gap-3 rounded-[16px] border border-border bg-surface-sunken px-4">
            <Avatar name={user.name} isSelf size={32} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[12px] text-muted">Part de {user.name}</span>
              <input
                type="text"
                inputMode="decimal"
                value={percentSelfInput}
                onChange={(event) => setPercentSelfInput(toDigits(event.target.value).slice(0, 3))}
                className="w-full border-0 bg-transparent p-0 text-[17px] font-bold text-ink outline-none"
              />
            </span>
            <span className="shrink-0 text-[15px] font-semibold text-muted">%</span>
          </label>
        )}

        {/* Aperçu live */}
        <div className="flex flex-col gap-2.5 rounded-[16px] bg-bg p-4">
          <div className="flex justify-between text-[15px] font-extrabold">
            <span className="text-clement-text">{percentSelf} %</span>
            <span className="text-laetitia-text">{100 - percentSelf} %</span>
          </div>
          <SplitBar percentSelf={percentSelf} height={10} />
          <div className="text-[13px] leading-relaxed text-muted">
            Pour {formatMoneyShort(10000)} de courses, {user.name} paie{' '}
            <strong className="text-ink">{formatMoneyShort(percentSelf * 100)}</strong> et {partner.name}{' '}
            <strong className="text-ink">{formatMoneyShort((100 - percentSelf) * 100)}</strong>.
          </div>
        </div>

        <Button onClick={handleSave} isLoading={isSaving}>
          Enregistrer
        </Button>
      </Card>

      {/* Votre couple */}
      <Card radius="xl" padding="none" className="flex flex-col px-5 py-2">
        <div className="pt-3 pb-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
          Votre couple
        </div>
        <div className="flex h-[60px] items-center gap-3 border-b border-track">
          <Avatar name={user.name} isSelf size={36} />
          <span className="flex-1 text-[15px] font-semibold">
            {user.name} <span className="font-medium text-muted">(vous)</span>
          </span>
        </div>
        <div className="flex h-[60px] items-center gap-3 border-b border-track">
          <Avatar name={partner.name} isSelf={false} size={36} />
          <span className="flex-1 text-[15px] font-semibold">{partner.name}</span>
        </div>
        <Link to="/personal" className="flex h-[60px] items-center gap-3">
          <span className="flex-1 text-[15px] font-semibold">Mes dépenses perso</span>
          <span className="text-placeholder">
            <ChevronRightIcon size={18} />
          </span>
        </Link>
      </Card>

      <Button variant="danger" onClick={handleLogout}>
        Se déconnecter
      </Button>
    </div>
  )
}
