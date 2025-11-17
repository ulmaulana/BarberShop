import { Link, useLocation } from 'react-router-dom'

interface NavItem {
  path: string
  label: string
  icon: string
}

const navItems: NavItem[] = [
  { path: '/adminpanel/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/adminpanel/products', label: 'Products', icon: '📦' },
  { path: '/adminpanel/services', label: 'Services', icon: '✂️' },
  { path: '/adminpanel/barbers', label: 'Barbers', icon: '💈' },
  { path: '/adminpanel/users', label: 'Users', icon: '👥' },
  { path: '/adminpanel/financial', label: 'Financial', icon: '💰' },
  { path: '/adminpanel/reports', label: 'Reports', icon: '📊' },
  { path: '/adminpanel/settings', label: 'Settings', icon: '⚙️' },
]

export function AdminSidebar() {
  const location = useLocation()
  
  return (
    <aside className="w-64 bg-white shadow-lg">
      {/* Logo */}
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-gray-800">
          💈 Sahala Barber
        </h1>
        <p className="text-sm text-gray-500 mt-1">Admin Dashboard</p>
      </div>
      
      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg
                transition-colors duration-150
                ${isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
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
