import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Card } from '../components'
import { expensesApi, type ApiExpense } from '../lib/api'
import { useToastStore, useAuthStore } from '../lib/stores'
import { CATEGORY_ICONS, CATEGORY_LABELS, type ExpenseCategory } from '../lib/types'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'
import type { ExpensesStackParamList } from '../navigation/types'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

dayjs.locale('fr')

type Props = {
  navigation: NativeStackNavigationProp<ExpensesStackParamList, 'ExpensesList'>
}

export function ExpensesScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user)
  const showToast = useToastStore((s) => s.show)
  const [expenses, setExpenses] = useState<ApiExpense[]>([])
  const [isClosed, setIsClosed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const now = dayjs()
  const year = now.year()
  const month = now.month() + 1

  const fetchExpenses = async () => {
    try {
      const data = await expensesApi.list(year, month)
      setExpenses(data.items)
      setIsClosed(data.isClosed)
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchExpenses()
    }, [year, month])
  )

  const onRefresh = () => {
    setRefreshing(true)
    fetchExpenses()
  }

  const handleDelete = (expense: ApiExpense) => {
    if (isClosed) {
      showToast('Impossible de supprimer une dépense d\'un mois clôturé', 'error')
      return
    }

    Alert.alert(
      'Supprimer la dépense',
      `Voulez-vous vraiment supprimer "${expense.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await expensesApi.delete(expense.id)
              setExpenses((prev) => prev.filter((e) => e.id !== expense.id))
              showToast('Dépense supprimée', 'success')
            } catch (error) {
              showToast('Erreur lors de la suppression', 'error')
            }
          },
        },
      ]
    )
  }

  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',') + ' €'
  }

  const renderExpense = ({ item }: { item: ApiExpense }) => {
    const category = item.category as ExpenseCategory
    const isCurrentUser = item.paidBy.userId === user?.id

    return (
      <TouchableOpacity
        onPress={() => {
          if (!isClosed) {
            navigation.navigate('EditExpense', { expenseId: item.id })
          }
        }}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <Card style={styles.expenseCard} padding="md">
          <View style={styles.expenseRow}>
            <View style={styles.categoryIcon}>
              <Text style={styles.categoryEmoji}>
                {CATEGORY_ICONS[category] || '📦'}
              </Text>
            </View>
            <View style={styles.expenseInfo}>
              <Text style={styles.expenseTitle}>{item.title}</Text>
              <Text style={styles.expenseCategory}>
                {CATEGORY_LABELS[category] || 'Autre'} • {item.paidBy.displayName}
              </Text>
            </View>
            <View style={styles.expenseAmount}>
              <Text style={styles.amountText}>{formatAmount(item.amountCents)}</Text>
              <Text style={styles.dateText}>
                {dayjs(item.spentAt).format('DD MMM')}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    )
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amountCents, 0)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Dépenses</Text>
        <Text style={styles.subtitle}>
          {now.format('MMMM YYYY').charAt(0).toUpperCase() +
            now.format('MMMM YYYY').slice(1)}
        </Text>
      </View>

      {isClosed && (
        <View style={styles.closedBanner}>
          <Text style={styles.closedText}>🔒 Mois clôturé</Text>
        </View>
      )}

      <View style={styles.totalBar}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>{formatAmount(totalExpenses)}</Text>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderExpense}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>💸</Text>
            <Text style={styles.emptyText}>Aucune dépense ce mois-ci</Text>
            <Text style={styles.emptySubtext}>
              Ajoutez votre première dépense !
            </Text>
          </View>
        }
      />

      {!isClosed && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddExpense')}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}
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
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  closedBanner: {
    backgroundColor: `${colors.warning}20`,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  closedText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  totalLabel: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  totalAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  expenseCard: {
    marginBottom: spacing.sm,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  expenseCategory: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  expenseAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  fabIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: fontWeight.normal,
  },
})