import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Providers } from './app/Providers'
import { AuthGuard } from './app/AuthGuard'
import { FullScreenLayout, Layout } from './components/Layout'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'
import { PWAInstallPrompt } from './components/PWAInstallPrompt'

import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { SetupPage } from './features/couple/SetupPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ExpensesPage } from './features/expenses/ExpensesPage'
import { ExpenseFormPage } from './features/expenses/ExpenseFormPage'
import { PersonalPage } from './features/personal/PersonalPage'
import { TransfersPage } from './features/transfers/TransfersPage'
import { ProfilePage } from './features/settings/ProfilePage'
import { SettingsPage } from './features/settings/SettingsPage'

import { HomePage } from './features/household/HomePage'
import { MealsPage } from './features/household/MealsPage'
import { ShoppingPage } from './features/household/ShoppingPage'
import { StatsPage } from './features/household/StatsPage'

const MealAssistantPage = lazy(() => import('./features/household/MealAssistantPage').then((module) => ({ default: module.MealAssistantPage })))
import { FoodProfilePage } from './features/household/FoodProfilePage'

import { PantryPage } from './features/household/PantryPage'

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Setup (auth required, no couple required) */}
      <Route
        path="/setup"
        element={
          <AuthGuard requireCouple={false}>
            <SetupPage />
          </AuthGuard>
        }
      />

      {/* Tab bar screens */}
      <Route
        element={
          <AuthGuard>
            <Layout />
          </AuthGuard>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/budget" element={<DashboardPage />} />
        <Route path="/meals" element={<MealsPage />} />
        <Route path="/meals/assistant" element={<Suspense fallback={<p role="status" className="py-8 text-center text-muted">Chargement de l’assistant…</p>}><MealAssistantPage /></Suspense>} />
        <Route path="/meals/preferences" element={<FoodProfilePage />} />
        <Route path="/meals/stock" element={<PantryPage />} />
        <Route path="/shopping" element={<ShoppingPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/transfers" element={<TransfersPage />} />
        <Route path="/personal" element={<PersonalPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Full-screen flows: they carry their own close button, no tab bar */}
      <Route
        element={
          <AuthGuard>
            <FullScreenLayout />
          </AuthGuard>
        }
      >
        <Route path="/expenses/new" element={<ExpenseFormPage />} />
        <Route path="/expenses/:id/edit" element={<ExpenseFormPage />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <Providers>
      <AppRoutes />
      <PWAUpdatePrompt />
      <PWAInstallPrompt />
    </Providers>
  )
}

export default App
