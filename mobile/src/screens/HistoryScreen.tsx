import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Card } from '../components'
import { monthsApi, type ApiHistoryItem } from '../lib/api'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'
import type { HistoryStackParamList } from '../navigation/types'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'

dayjs.locale('fr')

type Props = {
  navigation: NativeStackNavigationProp<HistoryStackParamList, 'HistoryList'>
}

export function HistoryScreen({ navigation }: Props) {
  const [history, setHistory] = useState<ApiHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchHistory = async () => {
    try {
      const data = await monthsApi.history()
      setHistory(data.items)
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchHistory()
    }, [])
  )

  const onRefresh = () => {
    setRefreshing(true)
    fetchHistory()
  }

  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',') + ' €'
  }

  const getMonthName = (year: number, month: number) => {
    const date = dayjs().year(year).month(month - 1)
    const monthName = date.format('MMMM YYYY')
    return monthName.charAt(0).toUpperCase() + monthName.slice(1)
  }

  const renderItem = ({ item }: { item: ApiHistoryItem }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate('HistoryDetail', {
          year: item.year,
          month: item.month,
        })
      }
      activeOpacity={0.7}
    >
      <Card style={styles.historyCard} padding="md">
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.monthName}>
              {getMonthName(item.year, item.month)}
            </Text>
            <Text style={styles.closedDate}>
              Clôturé le {dayjs(item.closedAt).format('DD/MM/YYYY')}
            </Text>
          </View>
          <Text style={styles.totalAmount}>{formatAmount(item.totalCents)}</Text>
        </View>

        {item.settlement && item.settlement.amountCents > 0 && (
          <View style={styles.settlementRow}>
            <Text style={styles.settlementText}>
              Règlement: {formatAmount(item.settlement.amountCents)}
            </Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  )

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
        <Text style={styles.title}>Historique</Text>
        <Text style={styles.subtitle}>Mois clôturés</Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => `${item.year}-${item.month}`}
        renderItem={renderItem}
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
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyText}>Aucun historique</Text>
            <Text style={styles.emptySubtext}>
              Les mois clôturés apparaîtront ici
            </Text>
          </View>
        }
      />
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
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
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  historyCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  monthName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  closedDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  totalAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  settlementRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  settlementText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
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
})