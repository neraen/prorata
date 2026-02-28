import React, { useEffect } from 'react'
import { StatusBar, View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import { useAuthStore, useCoupleStore } from './src/lib/stores'
import { Toast } from './src/components/Toast'
import { colors } from './src/theme'

// Screens
import { LoginScreen } from './src/screens/LoginScreen'
import { RegisterScreen } from './src/screens/RegisterScreen'
import { SetupScreen } from './src/screens/SetupScreen'
import { DashboardScreen } from './src/screens/DashboardScreen'
import { ExpensesScreen } from './src/screens/ExpensesScreen'
import { ExpenseFormScreen } from './src/screens/ExpenseFormScreen'
import { HistoryScreen } from './src/screens/HistoryScreen'
import { HistoryDetailScreen } from './src/screens/HistoryDetailScreen'
import { SettingsScreen } from './src/screens/SettingsScreen'

// Navigation types
import type {
  RootStackParamList,
  TabParamList,
  ExpensesStackParamList,
  HistoryStackParamList,
} from './src/navigation/types'

const RootStack = createNativeStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator<TabParamList>()
const ExpensesStack = createNativeStackNavigator<ExpensesStackParamList>()
const HistoryStack = createNativeStackNavigator<HistoryStackParamList>()

// Expenses Stack Navigator
function ExpensesNavigator() {
  return (
    <ExpensesStack.Navigator screenOptions={{ headerShown: false }}>
      <ExpensesStack.Screen name="ExpensesList" component={ExpensesScreen} />
      <ExpensesStack.Screen name="AddExpense" component={ExpenseFormScreen} />
      <ExpensesStack.Screen name="EditExpense" component={ExpenseFormScreen} />
    </ExpensesStack.Navigator>
  )
}

// History Stack Navigator
function HistoryNavigator() {
  return (
    <HistoryStack.Navigator screenOptions={{ headerShown: false }}>
      <HistoryStack.Screen name="HistoryList" component={HistoryScreen} />
      <HistoryStack.Screen name="HistoryDetail" component={HistoryDetailScreen} />
    </HistoryStack.Navigator>
  )
}

// Tab Navigator
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} />,
        }}
      />
      <Tab.Screen
        name="Expenses"
        component={ExpensesNavigator}
        options={{
          tabBarLabel: 'Dépenses',
          tabBarIcon: ({ color }) => <TabIcon icon="💸" color={color} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryNavigator}
        options={{
          tabBarLabel: 'Historique',
          tabBarIcon: ({ color }) => <TabIcon icon="📅" color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Réglages',
          tabBarIcon: ({ color }) => <TabIcon icon="⚙️" color={color} />,
        }}
      />
    </Tab.Navigator>
  )
}

function TabIcon({ icon, color }: { icon: string; color: string }) {
  return (
    <Text style={{ fontSize: 20, opacity: color === colors.primary ? 1 : 0.5 }}>
      {icon}
    </Text>
  )
}

// Loading Screen
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  )
}

// Root Navigator
function RootNavigator() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()
  const { couple, isLoading: coupleLoading, fetchCouple } = useCoupleStore()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchCouple()
    }
  }, [isAuthenticated])

  if (isLoading || (isAuthenticated && coupleLoading)) {
    return <LoadingScreen />
  }

  const hasCouple = couple && couple.members.length === 2

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <RootStack.Screen name="Login" component={LoginScreen} />
          <RootStack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : !hasCouple ? (
        <RootStack.Screen name="Setup" component={SetupScreen} />
      ) : (
        <RootStack.Screen name="Main" component={TabNavigator} />
      )}
    </RootStack.Navigator>
  )
}

// App
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      <Toast />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
})