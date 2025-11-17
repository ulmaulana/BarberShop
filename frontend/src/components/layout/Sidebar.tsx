import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface NavItem {
  path: string
  label: string
  icon: string
  roles?: string[]
}

const getDashboardPath = (role: string): string => {
  if (role === 'barber') return '/barber/dashboard'
  if (role === 'cashier') return '/cashier/dashboard'
  if (role === 'owner' || role === 'admin') return '/owner/dashboard'
  return '/dashboard'
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/appointments', label: 'Appointment', icon: '📅', roles: ['customer', 'barber', 'owner', 'admin'] },
  { path: '/queue', label: 'Antrian', icon: '👥' },
  { path: '/services', label: 'Layanan', icon: '✂️' },
  { path: '/products', label: 'Produk', icon: '🛍️' },
  { path: '/orders', label: 'Pesanan', icon: '📦', roles: ['customer', 'cashier', 'owner', 'admin'] },
  { path: '/barbers', label: 'Barber', icon: '💈', roles: ['owner', 'admin'] },
  { path: '/users', label: 'Pengguna', icon: '👤', roles: ['admin'] },
]

export function Sidebar() {
  const location = useLocation()
  const { user } = useAuth()

  const filteredItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  )

  return (
    <aside className="w-64 border-r border-gray-200 bg-white">
      <nav className="flex flex-col gap-1 p-4">
        {filteredItems.map((item) => {
          const path = item.path === '/dashboard' && user ? getDashboardPath(user.role) : item.path
          const isActive = location.pathname === path
          return (
            <Link
              key={item.path}
              to={path}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
