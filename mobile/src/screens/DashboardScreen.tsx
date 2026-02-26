import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { Card } from '../components'
import { useAuthStore, useCoupleStore } from '../lib/stores'
import { monthsApi, type ApiBalance } from '../lib/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'
import type { TabParamList } from '../navigation/types'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

dayjs.locale('fr')

type Props = {
  navigation: BottomTabNavigationProp<TabParamList, 'Dashboard'>
}

export function DashboardScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user)
  const couple = useCoupleStore((s) => s.couple)
  const [balance, setBalance] = useState<ApiBalance | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const now = dayjs()
  const year = now.year()
  const month = now.month() + 1

  const fetchBalance = async () => {
    try {
      const data = await monthsApi.balance(year, month)
      setBalance(data)
    } catch (error) {
      console.error('Error fetching balance:', error)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchBalance()
    }, [year, month])
  )

  const onRefresh = () => {
    setRefreshing(true)
    fetchBalance()
  }

  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',') + ' €'
  }

  const getPartner = () => {
    if (!couple || !user) return null
    return couple.members.find((m) => m.userId !== user.id)
  }

  const getCurrentUserBalance = () => {
    if (!balance || !user) return null
    return balance.members.find((m) => m.userId === user.id)
  }

  const getPartnerBalance = () => {
    if (!balance || !user) return null
    return balance.members.find((m) => m.userId !== user.id)
  }

  const partner = getPartner()
  const userBalance = getCurrentUserBalance()
  const partnerBalance = getPartnerBalance()

  const getSettlementText = () => {
    if (!balance?.settlement || balance.settlement.amountCents === 0) {
      return 'Vous êtes à l\'équilibre ! 🎉'
    }

    const amount = formatAmount(balance.settlement.amountCents)
    const fromName = balance.members.find(
      (m) => m.userId === balance.settlement?.fromUserId
    )?.displayName
    const toName = balance.members.find(
      (m) => m.userId === balance.settlement?.toUserId
    )?.displayName

    return `${fromName} doit ${amount} à ${toName}`
  }

  if (isLoading) {
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Bonjour {user?.name} 👋</Text>
          <Text style={styles.monthLabel}>
            {now.format('MMMM YYYY').charAt(0).toUpperCase() +
              now.format('MMMM YYYY').slice(1)}
          </Text>
        </View>

        {/* Balance Card */}
        <Card style={styles.balanceCard} padding="lg">
          <Text style={styles.balanceLabel}>Total du mois</Text>
          <Text style={styles.balanceAmount}>
            {balance ? formatAmount(balance.totalCents) : '0,00 €'}
          </Text>

          {balance?.isClosed && (
            <View style={styles.closedBadge}>
              <Text style={styles.closedBadgeText}>Mois clôturé</Text>
            </View>
          )}
        </Card>

        {/* Settlement Card */}
        <Card style={styles.settlementCard} padding="md">
          <Text style={styles.settlementText}>{getSettlementText()}</Text>
        </Card>

        {/* Members Balance */}
        <Text style={styles.sectionTitle}>Répartition</Text>
        <View style={styles.membersRow}>
          {userBalance && (
            <Card style={styles.memberCard} padding="md">
              <Text style={styles.memberName}>{userBalance.displayName}</Text>
              <Text style={styles.memberPaid}>
                Payé: {formatAmount(userBalance.paidCents)}
              </Text>
              <Text style={styles.memberTarget}>
                Part: {formatAmount(userBalance.targetCents)}
              </Text>
              <Text
                style={[
                  styles.memberDelta,
                  userBalance.deltaCents >= 0
                    ? styles.deltaPositive
                    : styles.deltaNegative,
                ]}
              >
                {userBalance.deltaCents >= 0 ? '+' : ''}
                {formatAmount(userBalance.deltaCents)}
              </Text>
            </Card>
          )}

          {partnerBalance && (
            <Card style={styles.memberCard} padding="md">
              <Text style={styles.memberName}>{partnerBalance.displayName}</Text>
              <Text style={styles.memberPaid}>
                Payé: {formatAmount(partnerBalance.paidCents)}
              </Text>
              <Text style={styles.memberTarget}>
                Part: {formatAmount(partnerBalance.targetCents)}
              </Text>
              <Text
                style={[
                  styles.memberDelta,
                  partnerBalance.deltaCents >= 0
                    ? styles.deltaPositive
                    : styles.deltaNegative,
                ]}
              >
                {partnerBalance.deltaCents >= 0 ? '+' : ''}
                {formatAmount(partnerBalance.deltaCents)}
              </Text>
            </Card>
          )}
        </View>

        {/* Quick Actions */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('Expenses', { screen: 'AddExpense' } as never)}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonIcon}>+</Text>
          <Text style={styles.addButtonText}>Ajouter une dépense</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  monthLabel: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  balanceCard: {
    backgroundColor: colors.primary,
    marginBottom: spacing.md,
  },
  balanceLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  closedBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  closedBadgeText: {
    fontSize: fontSize.xs,
    color: '#FFFFFF',
    fontWeight: fontWeight.medium,
  },
  settlementCard: {
    marginBottom: spacing.lg,
  },
  settlementText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  membersRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  memberCard: {
    flex: 1,
  },
  memberName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  memberPaid: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  memberTarget: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  memberDelta: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    marginTop: spacing.sm,
  },
  deltaPositive: {
    color: colors.success,
  },
  deltaNegative: {
    color: colors.danger,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  addButtonIcon: {
    fontSize: fontSize.xl,
    color: '#FFFFFF',
    fontWeight: fontWeight.bold,
  },
  addButtonText: {
    fontSize: fontSize.md,
    color: '#FFFFFF',
    fontWeight: fontWeight.semibold,
  },
})