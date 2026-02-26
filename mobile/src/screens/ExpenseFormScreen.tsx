import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import { Button, Input, Card } from '../components'
import { expensesApi, type ApiExpense } from '../lib/api'
import { useAuthStore, useCoupleStore, useToastStore } from '../lib/stores'
import { CATEGORY_ICONS, CATEGORY_LABELS, type ExpenseCategory } from '../lib/types'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'
import type { ExpensesStackParamList } from '../navigation/types'
import dayjs from 'dayjs'

type Props = {
  navigation: NativeStackNavigationProp<ExpensesStackParamList, 'AddExpense' | 'EditExpense'>
  route: RouteProp<ExpensesStackParamList, 'AddExpense' | 'EditExpense'>
}

const CATEGORIES: ExpenseCategory[] = [
  'groceries',
  'leisure',
  'transport',
  'housing',
  'health',
  'other',
]

export function ExpenseFormScreen({ navigation, route }: Props) {
  const expenseId = route.params && 'expenseId' in route.params ? route.params.expenseId : undefined
  const isEditing = !!expenseId

  const user = useAuthStore((s) => s.user)
  const couple = useCoupleStore((s) => s.couple)
  const showToast = useToastStore((s) => s.show)

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('other')
  const [paidByUserId, setPaidByUserId] = useState<number>(user?.id || 0)
  const [spentAt, setSpentAt] = useState(dayjs().format('YYYY-MM-DD'))
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(isEditing)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isEditing && expenseId) {
      fetchExpense()
    }
  }, [expenseId])

  const fetchExpense = async () => {
    if (!expenseId) return

    try {
      const now = dayjs()
      const data = await expensesApi.list(now.year(), now.month() + 1)
      const expense = data.items.find((e) => e.id === expenseId)

      if (expense) {
        setTitle(expense.title)
        setAmount((expense.amountCents / 100).toString())
        setCategory(expense.category as ExpenseCategory)
        setPaidByUserId(expense.paidBy.userId)
        setSpentAt(expense.spentAt.split('T')[0])
      }
    } catch (err) {
      setError('Erreur lors du chargement')
    } finally {
      setIsFetching(false)
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Veuillez entrer un titre')
      return
    }

    const amountCents = Math.round(parseFloat(amount.replace(',', '.')) * 100)
    if (isNaN(amountCents) || amountCents <= 0) {
      setError('Veuillez entrer un montant valide')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (isEditing && expenseId) {
        await expensesApi.update(expenseId, {
          title: title.trim(),
          category,
          amountCents,
          spentAt,
          paidByUserId,
        })
        showToast('Dépense modifiée', 'success')
      } else {
        await expensesApi.create({
          title: title.trim(),
          category,
          amountCents,
          currency: 'EUR',
          spentAt,
          paidByUserId,
        })
        showToast('Dépense ajoutée', 'success')
      }
      navigation.goBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButton}>Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {isEditing ? 'Modifier' : 'Nouvelle dépense'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Input
            label="Titre"
            placeholder="Ex: Courses Carrefour"
            value={title}
            onChangeText={setTitle}
          />

          <Input
            label="Montant (€)"
            placeholder="0,00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Catégorie</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  category === cat && styles.categoryButtonActive,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text style={styles.categoryEmoji}>{CATEGORY_ICONS[cat]}</Text>
                <Text
                  style={[
                    styles.categoryLabel,
                    category === cat && styles.categoryLabelActive,
                  ]}
                >
                  {CATEGORY_LABELS[cat]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Payé par</Text>
          <View style={styles.paidByRow}>
            {couple?.members.map((member) => (
              <TouchableOpacity
                key={member.userId}
                style={[
                  styles.paidByButton,
                  paidByUserId === member.userId && styles.paidByButtonActive,
                ]}
                onPress={() => setPaidByUserId(member.userId)}
              >
                <Text
                  style={[
                    styles.paidByText,
                    paidByUserId === member.userId && styles.paidByTextActive,
                  ]}
                >
                  {member.displayName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Date"
            placeholder="YYYY-MM-DD"
            value={spentAt}
            onChangeText={setSpentAt}
          />

          <Button
            onPress={handleSubmit}
            isLoading={isLoading}
            style={styles.submitButton}
          >
            {isEditing ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelButton: {
    fontSize: fontSize.md,
    color: colors.primary,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  placeholder: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
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
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryButton: {
    width: '31%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  categoryButtonActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  categoryLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  categoryLabelActive: {
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  paidByRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  paidByButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  paidByButtonActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  paidByText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  paidByTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  submitButton: {
    marginTop: spacing.lg,
  },
})