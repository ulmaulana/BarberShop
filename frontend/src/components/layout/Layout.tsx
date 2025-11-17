import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

interface LayoutProps {
  requireSidebar?: boolean
}

export function Layout({ requireSidebar = false }: LayoutProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const showSidebar = requireSidebar && user

  // CRITICAL: Detect admin login in customer layout
  useEffect(() => {
    if (user && user.role === 'admin') {
      // Admin detected in customer route - immediate redirect
      const isAdminRoute = location.pathname.startsWith('/adminpanel')
      if (!isAdminRoute) {
        console.warn('🚨 ADMIN LOGIN DETECTED IN CUSTOMER LAYOUT - REDIRECTING')
        showToast('Admin login detected! Redirecting to Admin Panel...', 'error')
        navigate('/adminpanel/dashboard', { replace: true })
      }
    }
  }, [user, navigate, location.pathname, showToast])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        {showSidebar && <Sidebar />}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
