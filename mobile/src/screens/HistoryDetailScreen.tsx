import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import { Card } from '../components'
import { monthsApi, type ApiBalance } from '../lib/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'
import type { HistoryStackParamList } from '../navigation/types'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

dayjs.locale('fr')

type Props = {
  navigation: NativeStackNavigationProp<HistoryStackParamList, 'HistoryDetail'>
  route: RouteProp<HistoryStackParamList, 'HistoryDetail'>
}

export function HistoryDetailScreen({ navigation, route }: Props) {
  const { year, month } = route.params
  const [balance, setBalance] = useState<ApiBalance | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDetail()
  }, [year, month])

  const fetchDetail = async () => {
    try {
      const data = await monthsApi.detail(year, month)
      setBalance(data)
    } catch (error) {
      console.error('Error fetching detail:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',') + ' €'
  }

  const getMonthName = () => {
    const date = dayjs().year(year).month(month - 1)
    const monthName = date.format('MMMM YYYY')
    return monthName.charAt(0).toUpperCase() + monthName.slice(1)
  }

  const getSettlementText = () => {
    if (!balance?.settlement || balance.settlement.amountCents === 0) {
      return 'Vous étiez à l\'équilibre'
    }

    const amount = formatAmount(balance.settlement.amountCents)
    const fromName = balance.members.find(
      (m) => m.userId === balance.settlement?.fromUserId
    )?.displayName
    const toName = balance.members.find(
      (m) => m.userId === balance.settlement?.toUserId
    )?.displayName

    return `${fromName} devait ${amount} à ${toName}`
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{getMonthName()}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Total Card */}
        <Card style={styles.totalCard} padding="lg">
          <Text style={styles.totalLabel}>Total du mois</Text>
          <Text style={styles.totalAmount}>
            {balance ? formatAmount(balance.totalCents) : '0,00 €'}
          </Text>
          <View style={styles.closedBadge}>
            <Text style={styles.closedBadgeText}>🔒 Clôturé</Text>
          </View>
        </Card>

        {/* Settlement */}
        <Card style={styles.settlementCard} padding="md">
          <Text style={styles.settlementTitle}>Règlement</Text>
          <Text style={styles.settlementText}>{getSettlementText()}</Text>
        </Card>

        {/* Members */}
        <Text style={styles.sectionTitle}>Répartition</Text>
        {balance?.members.map((member) => (
          <Card key={member.userId} style={styles.memberCard} padding="md">
            <View style={styles.memberHeader}>
              <Text style={styles.memberName}>{member.displayName}</Text>
              <Text
                style={[
                  styles.memberDelta,
                  member.deltaCents >= 0 ? styles.deltaPositive : styles.deltaNegative,
                ]}
              >
                {member.deltaCents >= 0 ? '+' : ''}
                {formatAmount(member.deltaCents)}
              </Text>
            </View>
            <View style={styles.memberStats}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Payé</Text>
                <Text style={styles.statValue}>
                  {formatAmount(member.paidCents)}
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Part due</Text>
                <Text style={styles.statValue}>
                  {formatAmount(member.targetCents)}
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Poids</Text>
                <Text style={styles.statValue}>
                  {Math.round(member.weight * 100)}%
                </Text>
              </View>
            </View>
          </Card>
        ))}
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
  backButton: {
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
  totalCard: {
    backgroundColor: colors.primary,
    marginBottom: spacing.md,
  },
  totalLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.xs,
  },
  totalAmount: {
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
  settlementTitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  settlementText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  memberCard: {
    marginBottom: spacing.md,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  memberName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  memberDelta: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  deltaPositive: {
    color: colors.success,
  },
  deltaNegative: {
    color: colors.danger,
  },
  memberStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
})