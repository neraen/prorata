import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Input, Card } from '../components'
import { useAuthStore, useCoupleStore, useToastStore } from '../lib/stores'
import { monthsApi } from '../lib/api'
import type { CoupleSettings } from '../lib/types'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'
import dayjs from 'dayjs'

type Mode = 'income' | 'percentage' | 'equal'

const MODE_OPTIONS: { value: Mode; label: string; description: string }[] = [
  {
    value: 'equal',
    label: 'Égalitaire',
    description: 'Chacun paie 50%',
  },
  {
    value: 'income',
    label: 'Au prorata des revenus',
    description: 'Selon vos salaires',
  },
  {
    value: 'percentage',
    label: 'Pourcentage personnalisé',
    description: 'Vous définissez la répartition',
  },
]

export function SettingsScreen() {
  const user = useAuthStore((s) => s.user)
  const { couple, updateSettings } = useCoupleStore()
  const logout = useAuthStore((s) => s.logout)
  const showToast = useToastStore((s) => s.show)

  const [mode, setMode] = useState<Mode>('equal')
  const [incomeA, setIncomeA] = useState('')
  const [incomeB, setIncomeB] = useState('')
  const [percentageA, setPercentageA] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (couple) {
      setMode(couple.mode)

      const memberA = couple.members[0]
      const memberB = couple.members[1]

      if (memberA?.incomeCents) {
        setIncomeA((memberA.incomeCents / 100).toString())
      }
      if (memberB?.incomeCents) {
        setIncomeB((memberB.incomeCents / 100).toString())
      }
      if (memberA?.percentage) {
        setPercentageA(memberA.percentage.toString())
      }
    }
  }, [couple])

  const handleSave = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const settings: CoupleSettings = { mode }

      if (mode === 'income') {
        settings.incomeA = parseFloat(incomeA.replace(',', '.')) || 0
        settings.incomeB = parseFloat(incomeB.replace(',', '.')) || 0
      } else if (mode === 'percentage') {
        settings.percentageA = parseFloat(percentageA.replace(',', '.')) || 50
        settings.percentageB = 100 - (settings.percentageA || 50)
      }

      await updateSettings(settings)
      showToast('Paramètres enregistrés', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseMonth = () => {
    const now = dayjs()
    const monthName = now.format('MMMM YYYY')

    Alert.alert(
      'Clôturer le mois',
      `Voulez-vous clôturer ${monthName} ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Clôturer',
          style: 'destructive',
          onPress: async () => {
            setIsClosing(true)
            try {
              await monthsApi.close(now.year(), now.month() + 1)
              showToast('Mois clôturé avec succès', 'success')
            } catch (err) {
              showToast(
                err instanceof Error ? err.message : 'Erreur',
                'error'
              )
            } finally {
              setIsClosing(false)
            }
          },
        },
      ]
    )
  }

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: logout,
      },
    ])
  }

  const memberA = couple?.members[0]
  const memberB = couple?.members[1]

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Paramètres</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Mode Selection */}
        <Text style={styles.sectionTitle}>Mode de répartition</Text>
        <Card padding="none" style={styles.modeCard}>
          {MODE_OPTIONS.map((option, index) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.modeOption,
                index < MODE_OPTIONS.length - 1 && styles.modeOptionBorder,
                mode === option.value && styles.modeOptionActive,
              ]}
              onPress={() => setMode(option.value)}
            >
              <View style={styles.modeOptionContent}>
                <Text
                  style={[
                    styles.modeLabel,
                    mode === option.value && styles.modeLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
                <Text style={styles.modeDescription}>{option.description}</Text>
              </View>
              <View
                style={[
                  styles.radioOuter,
                  mode === option.value && styles.radioOuterActive,
                ]}
              >
                {mode === option.value && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}
        </Card>

        {/* Income Fields */}
        {mode === 'income' && (
          <Card style={styles.fieldsCard} padding="md">
            <Input
              label={`Revenus de ${memberA?.displayName || 'Membre 1'} (€)`}
              placeholder="0"
              value={incomeA}
              onChangeText={setIncomeA}
              keyboardType="decimal-pad"
            />
            <Input
              label={`Revenus de ${memberB?.displayName || 'Membre 2'} (€)`}
              placeholder="0"
              value={incomeB}
              onChangeText={setIncomeB}
              keyboardType="decimal-pad"
              containerStyle={styles.noMargin}
            />
          </Card>
        )}

        {/* Percentage Fields */}
        {mode === 'percentage' && (
          <Card style={styles.fieldsCard} padding="md">
            <Input
              label={`Part de ${memberA?.displayName || 'Membre 1'} (%)`}
              placeholder="50"
              value={percentageA}
              onChangeText={setPercentageA}
              keyboardType="decimal-pad"
            />
            <Text style={styles.percentageNote}>
              Part de {memberB?.displayName || 'Membre 2'}:{' '}
              {100 - (parseFloat(percentageA) || 50)}%
            </Text>
          </Card>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Button onPress={handleSave} isLoading={isLoading}>
          Enregistrer
        </Button>

        {/* Close Month */}
        <Text style={[styles.sectionTitle, styles.marginTop]}>
          Gestion du mois
        </Text>
        <Card padding="md">
          <Text style={styles.closeMonthText}>
            Clôturer le mois actuel pour figer les comptes et passer au mois
            suivant.
          </Text>
          <Button
            variant="secondary"
            onPress={handleCloseMonth}
            isLoading={isClosing}
            style={styles.closeButton}
          >
            Clôturer le mois
          </Button>
        </Card>

        {/* Account */}
        <Text style={[styles.sectionTitle, styles.marginTop]}>Compte</Text>
        <Card padding="md">
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>{user?.name}</Text>
            <Text style={styles.accountEmail}>{user?.email}</Text>
          </View>
          <Button variant="danger" onPress={handleLogout}>
            Se déconnecter
          </Button>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  marginTop: {
    marginTop: spacing.xl,
  },
  modeCard: {
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  modeOptionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modeOptionActive: {
    backgroundColor: `${colors.primary}08`,
  },
  modeOptionContent: {
    flex: 1,
  },
  modeLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  modeLabelActive: {
    color: colors.primary,
  },
  modeDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  fieldsCard: {
    marginBottom: spacing.lg,
  },
  noMargin: {
    marginBottom: 0,
  },
  percentageNote: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  errorContainer: {
    backgroundColor: `${colors.danger}15`,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  closeMonthText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  closeButton: {
    marginTop: spacing.sm,
  },
  accountInfo: {
    marginBottom: spacing.md,
  },
  accountName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  accountEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
})