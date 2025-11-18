import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function BottomNav() {
  const location = useLocation()
  const { user } = useAuth()

  // Don't show bottom nav if not logged in or on admin routes
  if (!user || user.role === 'admin' || location.pathname.startsWith('/adminpanel')) {
    return null
  }

  const navItems = [
    {
      path: '/appointments',
      icon: '📅',
      label: 'Appointments'
    },
    {
      path: '/queue',
      icon: '👥',
      label: 'Antrian'
    },
    {
      path: '/orders',
      icon: '📦',
      label: 'Pesanan'
    }
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 md:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
                isActive
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="text-2xl mb-1">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
