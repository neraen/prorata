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
import { SettingsPage } from './features/settings/SettingsPage'

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
        <Route path="/" element={<DashboardPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/transfers" element={<TransfersPage />} />
        <Route path="/personal" element={<PersonalPage />} />
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
