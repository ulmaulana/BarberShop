import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import type { UserRole } from '../../types/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  requireEmailVerification?: boolean
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requireEmailVerification = false,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requireEmailVerification && !user.emailVerified) {
    return <Navigate to="/verify-email" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
