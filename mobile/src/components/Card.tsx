import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { colors, borderRadius, spacing } from '../theme'

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ children, style, padding = 'md' }: CardProps) {
  return (
    <View style={[styles.card, styles[`padding_${padding}`], style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  padding_none: {
    padding: 0,
  },
  padding_sm: {
    padding: spacing.sm,
  },
  padding_md: {
    padding: spacing.md,
  },
  padding_lg: {
    padding: spacing.lg,
  },
})