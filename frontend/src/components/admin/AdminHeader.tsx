import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { useToast } from '../../contexts/ToastContext'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { adminFirestore } from '../../config/firebaseAdmin'


interface AdminHeaderProps {
  onToggleSidebar: () => void
}

interface Notification {
  id: string
  type: 'payment' | 'stock' | 'appointment' | 'order'
  message: string
  icon: string
}

export function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  const { user, logout } = useAdminAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  
  // Realtime notifications
  useEffect(() => {
    const notifs: Notification[] = []
    
    // Listen for pending payments
    const ordersRef = collection(adminFirestore, 'orders')
    const pendingPaymentsQuery = query(ordersRef, where('status', '==', 'pending_payment'))
    
    const unsubOrders = onSnapshot(pendingPaymentsQuery, (snapshot) => {
      const pendingCount = snapshot.size
      const updatedNotifs = [...notifs.filter(n => n.type !== 'payment')]
      
      if (pendingCount > 0) {
        updatedNotifs.push({
          id: 'pending-payments',
          type: 'payment',
          message: `${pendingCount} pembayaran menunggu verifikasi`,
          icon: 'payment'
        })
      }
      
      // Check low stock products
      const productsRef = collection(adminFirestore, 'products')
      onSnapshot(productsRef, (prodSnapshot) => {
        const lowStockProducts = prodSnapshot.docs.filter(doc => {
          const data = doc.data()
          return data.stock <= (data.minStockThreshold || 5)
        })
        
        const finalNotifs = [...updatedNotifs.filter(n => n.type !== 'stock')]
        
        if (lowStockProducts.length > 0) {
          finalNotifs.push({
            id: 'low-stock',
            type: 'stock',
            message: `${lowStockProducts.length} produk stok menipis`,
            icon: 'stock'
          })
        }
        
        // Check pending appointments
        const appointmentsRef = collection(adminFirestore, 'appointments')
        const pendingAptsQuery = query(appointmentsRef, where('status', '==', 'pending'))
        
        onSnapshot(pendingAptsQuery, (aptSnapshot) => {
          const pendingApts = aptSnapshot.size
          const allNotifs = [...finalNotifs.filter(n => n.type !== 'appointment')]
          
          if (pendingApts > 0) {
            allNotifs.push({
              id: 'pending-appointments',
              type: 'appointment',
              message: `${pendingApts} appointment menunggu konfirmasi`,
              icon: 'appointment'
            })
          }
          
          setNotifications(allNotifs)
        })
      })
    })
    
    return () => {
      unsubOrders()
    }
  }, [])
  
  const handleLogout = async () => {
    try {
      await logout()
      showToast('Logged out successfully', 'success')
      navigate('/admin/login')
    } catch (error) {
      showToast('Failed to logout', 'error')
    }
  }

  // Handle notification click - redirect to relevant page
  const handleNotificationClick = (notif: Notification) => {
    setShowNotifications(false)
    
    switch (notif.type) {
      case 'payment':
        navigate('/adminpanel/payments')
        break
      case 'stock':
        navigate('/adminpanel/products')
        break
      case 'appointment':
        navigate('/adminpanel/appointments')
        break
      default:
        break
    }
  }
  
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
            <span className="text-2xl">✂️</span>
            <h1 className="text-lg font-bold text-gray-800">Sahala Barber</h1>
          </div>
        </div>
        
        {/* Spacer for desktop to push right side to end */}
        <div className="hidden lg:block flex-1"></div>
        
        {/* Right Side - Notifications & Profile */}
        <div className="flex items-center gap-3 sm:gap-6 ml-auto">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
          >
            <span className="text-xl">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-50">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-800">Notifikasi</h3>
              </div>
              <div className="max-h-96 overflow-auto">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      onClick={() => handleNotificationClick(notif)}
                      className="p-4 border-b hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                    >
                      <span className="text-xl">
                      {notif.icon === 'payment' && '💳'}
                      {notif.icon === 'stock' && '📦'}
                      {notif.icon === 'appointment' && '📅'}
                    </span>
                      <p className="text-sm text-gray-700">{notif.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Tidak ada notifikasi
                  </div>
                )}
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
            <span className="text-xl">👤</span>
            <span className="text-sm font-medium text-gray-700">Admin</span>
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
