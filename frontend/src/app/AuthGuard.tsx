import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, useCoupleStore } from '../lib/stores'

interface AuthGuardProps {
  children: React.ReactNode
  requireCouple?: boolean
}

export function AuthGuard({ children, requireCouple = true }: AuthGuardProps) {
  const location = useLocation()
  const { user, isLoading: isAuthLoading, checkAuth } = useAuthStore()
  const { couple, isLoading: isCoupleLoading, fetchCouple } = useCoupleStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (user) {
      fetchCouple()
    }
  }, [user, fetchCouple])

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireCouple && isCoupleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Couple required: need couple with 2 members
  if (requireCouple && (!couple || couple.members.length < 2)) {
    return <Navigate to="/setup" replace />
  }

  return <>{children}</>
}