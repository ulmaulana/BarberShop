import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface NavItem {
  path: string
  label: string
  icon: string
  roles?: string[]
}

const navItems: NavItem[] = [
  { path: '/appointments', label: 'Appointment', icon: '📅', roles: ['customer', 'barber', 'owner', 'admin'] },
  { path: '/queue', label: 'Antrian', icon: '👥' },
  { path: '/services', label: 'Layanan', icon: '✂️', roles: ['barber', 'owner', 'admin'] },
  { path: '/products', label: 'Produk', icon: '🛍️', roles: ['cashier', 'owner', 'admin'] },
  { path: '/orders', label: 'Pesanan', icon: '📦', roles: ['customer', 'cashier', 'owner', 'admin'] },
  { path: '/barbers', label: 'Barber', icon: '💈', roles: ['owner', 'admin'] },
  { path: '/users', label: 'Pengguna', icon: '👤', roles: ['admin'] },
]

export function Sidebar() {
  const location = useLocation()
  const { user } = useAuth()

  // GUARD: Don't render sidebar if admin (should use admin panel)
  if (user && user.role === 'admin') {
    console.warn('🚨 ADMIN DETECTED IN CUSTOMER SIDEBAR - SHOULD NOT RENDER')
    return null
  }

  const filteredItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  )

  return (
    <aside className="hidden md:flex w-64 border-r border-gray-200 bg-white flex-col">
      <nav className="flex flex-col gap-1 p-4 flex-1">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
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

      {/* Profile Section - Bottom of Sidebar */}
      <div className="border-t border-gray-200 p-4">
        <Link
          to="/profile/edit"
          className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
            location.pathname === '/profile/edit'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <span className="text-xl">⚙️</span>
          <div className="flex-1">
            <div className="font-medium">Profile</div>
            <div className="text-xs text-gray-500">{user?.email}</div>
          </div>
        </Link>
      </div>
    </aside>
  )
}
