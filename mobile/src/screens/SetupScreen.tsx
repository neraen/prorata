import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
import { Button, Input, Card } from '../components'
import { useAuthStore, useCoupleStore, useToastStore } from '../lib/stores'
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme'

export function SetupScreen() {
  const user = useAuthStore((s) => s.user)
  const { createCouple, invitePartner, joinCouple, couple, inviteToken } = useCoupleStore()
  const showToast = useToastStore((s) => s.show)

  const [inviteCode, setInviteCode] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  // Show invite token after creating couple
  if (couple && couple.members.length === 1 && inviteToken) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Card style={styles.card} padding="lg">
            <View style={styles.header}>
              <Text style={styles.emoji}>🎉</Text>
              <Text style={styles.title}>Invitation envoyée !</Text>
              <Text style={styles.subtitle}>
                Partagez ce code avec votre partenaire
              </Text>
            </View>

            <View style={styles.tokenContainer}>
              <Text style={styles.tokenLabel}>Code d'invitation</Text>
              <Text style={styles.token}>{inviteToken}</Text>
            </View>

            <Button
              variant="secondary"
              onPress={async () => {
                await Clipboard.setStringAsync(inviteToken)
                showToast('Code copié !', 'success')
              }}
            >
              Copier le code
            </Button>

            <Text style={styles.waitingText}>
              En attente de votre partenaire...
            </Text>
          </Card>
        </View>
      </SafeAreaView>
    )
  }

  // Show invite form after creating couple
  if (couple && couple.members.length === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Card style={styles.card} padding="lg">
              <View style={styles.header}>
                <Text style={styles.emoji}>💌</Text>
                <Text style={styles.title}>Inviter votre partenaire</Text>
                <Text style={styles.subtitle}>
                  Entrez l'email de votre partenaire pour l'inviter
                </Text>
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Input
                label="Email du partenaire"
                placeholder="partenaire@email.com"
                value={partnerEmail}
                onChangeText={setPartnerEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Button
                onPress={async () => {
                  if (!partnerEmail.trim()) {
                    setError("Entrez l'email de votre partenaire")
                    return
                  }
                  setIsInviting(true)
                  setError(null)
                  try {
                    await invitePartner(partnerEmail.trim())
                    showToast('Invitation créée !', 'success')
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Erreur')
                  } finally {
                    setIsInviting(false)
                  }
                }}
                isLoading={isInviting}
              >
                Créer l'invitation
              </Button>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  // Initial setup screen
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.card} padding="lg">
            <View style={styles.header}>
              <Text style={styles.emoji}>💑</Text>
              <Text style={styles.title}>Bonjour {user.name} !</Text>
              <Text style={styles.subtitle}>
                Créez ou rejoignez un couple pour commencer
              </Text>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.section}>
              <Button
                onPress={async () => {
                  setIsCreating(true)
                  setError(null)
                  try {
                    await createCouple()
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Erreur')
                  } finally {
                    setIsCreating(false)
                  }
                }}
                isLoading={isCreating}
              >
                Créer un couple
              </Button>
              <Text style={styles.hint}>Vous recevrez un code à partager</Text>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.section}>
              <Input
                label="Code d'invitation"
                placeholder="Collez le code ici"
                value={inviteCode}
                onChangeText={setInviteCode}
              />
              <Button
                variant="secondary"
                onPress={async () => {
                  if (!inviteCode.trim()) {
                    setError("Entrez un code d'invitation")
                    return
                  }
                  setIsJoining(true)
                  setError(null)
                  try {
                    await joinCouple(inviteCode.trim())
                    showToast('Couple rejoint avec succès !', 'success')
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Erreur')
                  } finally {
                    setIsJoining(false)
                  }
                }}
                isLoading={isJoining}
              >
                Rejoindre
              </Button>
            </View>
          </Card>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
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
  section: {
    gap: spacing.sm,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  tokenContainer: {
    backgroundColor: `${colors.primary}15`,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  tokenLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  token: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    textAlign: 'center',
  },
  waitingText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
})