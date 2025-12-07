import { Link, useLocation } from 'react-router-dom'

interface NavItem {
  path: string
  label: string
  icon: string
}

const navItems: NavItem[] = [
  { path: '/adminpanel/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/adminpanel/appointments', label: 'Appointments', icon: '📅' },
  { path: '/adminpanel/payments', label: 'Payments', icon: '💳' },
  { path: '/adminpanel/products', label: 'Products', icon: '📦' },
  { path: '/adminpanel/services', label: 'Services', icon: '✂️' },
  { path: '/adminpanel/vouchers', label: 'Vouchers', icon: '🎟️' },
  { path: '/adminpanel/financial', label: 'Financial', icon: '💰' },
  { path: '/adminpanel/reports', label: 'Reports', icon: '📈' },
]

interface AdminSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const location = useLocation()
  
  return (
    <>
      {/* Overlay for mobile (dark background) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white shadow-lg
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
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
              onClick={onClose}
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
    </>
  )
}
