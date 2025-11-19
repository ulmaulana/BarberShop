import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { useToast } from '../../contexts/ToastContext'

interface AdminHeaderProps {
  onToggleSidebar: () => void
}

export function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  const { user, logout } = useAdminAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  
  const handleLogout = async () => {
    try {
      await logout()
      showToast('Logged out successfully', 'success')
      navigate('/admin/login')
    } catch (error) {
      showToast('Failed to logout', 'error')
    }
  }
  
  // Mock notifications (nanti dari Firestore)
  const notifications = [
    { id: 1, type: 'payment', message: '3 payments pending verification' },
    { id: 2, type: 'stock', message: '2 products low stock' },
    { id: 3, type: 'order', message: '5 new orders today' },
  ]
  
  const unreadCount = notifications.length
  
  return (
    <header className="bg-white shadow-sm border-b px-3 sm:px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Mobile Hamburger + Logo (Visible on Mobile Only) */}
        <div className="flex items-center gap-3 lg:hidden">
          <button
            onClick={onToggleSidebar}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
            aria-label="Toggle sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💈</span>
            <h1 className="text-lg font-bold text-gray-800">Sahala Barber</h1>
          </div>
        </div>
        
        {/* Right Side - Notifications & Profile */}
        <div className="flex items-center gap-3 sm:gap-6">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-50">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-800">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-auto">
                {notifications.map((notif) => (
                  <div key={notif.id} className="p-4 border-b hover:bg-gray-50 cursor-pointer">
                    <p className="text-sm text-gray-700">{notif.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <span className="text-2xl">👤</span>
            <span className="text-sm font-medium text-gray-700">
              {user?.email || 'Admin'}
            </span>
            <span className="text-gray-400">▼</span>
          </button>
          
          {showProfile && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border z-50">
              <div className="p-4 border-b">
                <p className="text-sm font-medium text-gray-800">Admin</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full p-3 text-left text-sm text-red-600 hover:bg-red-50 rounded-b-lg transition"
              >
                Logout
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </header>
  )
}
