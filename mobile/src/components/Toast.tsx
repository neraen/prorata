import React, { useEffect } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useToastStore } from '../lib/stores'
import { colors, borderRadius, spacing, fontSize } from '../theme'

export function Toast() {
  const insets = useSafeAreaInsets()
  const { message, type, hide } = useToastStore()
  const opacity = React.useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (message) {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(2500),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => hide())
    }
  }, [message])

  if (!message) return null

  const backgroundColor = {
    success: colors.success,
    error: colors.danger,
    info: colors.primary,
  }[type]

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + spacing.md, opacity, backgroundColor },
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    zIndex: 9999,
  },
  text: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '500',
    textAlign: 'center',
  },
})