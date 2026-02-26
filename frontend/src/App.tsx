import { Routes, Route } from 'react-router-dom'
import { Providers } from './app/Providers'
import { AuthGuard } from './app/AuthGuard'
import { Layout } from './components/Layout'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'
import { PWAInstallPrompt } from './components/PWAInstallPrompt'

import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { SetupPage } from './features/couple/SetupPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ExpensesPage } from './features/expenses/ExpensesPage'
import { ExpenseFormPage } from './features/expenses/ExpenseFormPage'
import { HistoryPage } from './features/history/HistoryPage'
import { HistoryDetailPage } from './features/history/HistoryDetailPage'
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

      {/* Protected routes (auth + couple required) */}
      <Route
        element={
          <AuthGuard>
            <Layout />
          </AuthGuard>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/expenses/new" element={<ExpenseFormPage />} />
        <Route path="/expenses/:id/edit" element={<ExpenseFormPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:year/:month" element={<HistoryDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
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