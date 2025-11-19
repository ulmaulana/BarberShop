import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { customerFirestore } from '../../config/firebaseCustomer'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

export function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [cartCount, setCartCount] = useState(0)

  // CRITICAL: Detect admin in customer header
  useEffect(() => {
    if (user && user.role === 'admin') {
      const isAdminRoute = location.pathname.startsWith('/adminpanel')
      if (!isAdminRoute) {
        console.warn('🚨 ADMIN IN CUSTOMER HEADER - REDIRECTING')
        showToast('Admin terdeteksi! Gunakan Panel Admin.', 'error')
        navigate('/adminpanel/dashboard', { replace: true })
      }
    }
  }, [user, location.pathname, navigate, showToast])

  // Real-time cart counter
  useEffect(() => {
    if (!user) {
      setCartCount(0)
      return
    }

    const cartRef = collection(customerFirestore, 'cart')
    const q = query(cartRef, where('userId', '==', user.uid))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const totalItems = snapshot.docs.reduce((total, doc) => {
        return total + (doc.data().quantity || 1)
      }, 0)
      setCartCount(totalItems)
    })

    return () => unsubscribe()
  }, [user])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Mobile Hamburger + Logo */}
        <div className="flex items-center gap-3">
          {/* Hamburger Menu - Mobile Only */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 text-gray-700 hover:text-blue-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {showMobileMenu ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-900 hover:text-blue-600 transition">
            <span className="text-xl sm:text-2xl">💈</span>
            <span className="hidden sm:inline">Sahala Barber</span>
          </Link>
        </div>

        {/* Desktop Navigation Menu */}
        <nav className="hidden md:flex items-center gap-2 bg-gray-50 rounded-full px-3 py-2 shadow-sm">
          <Link 
            to="/" 
            className={`px-6 py-2.5 rounded-full font-medium transition-all ${
              location.pathname === '/' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            Home
          </Link>
          <Link 
            to="/services" 
            className={`px-6 py-2.5 rounded-full font-medium transition-all ${
              location.pathname === '/services' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            Potong Rambut
          </Link>
          <Link 
            to="/products" 
            className={`px-6 py-2.5 rounded-full font-medium transition-all ${
              location.pathname === '/products' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            Produk
          </Link>
          <Link 
            to="/booking" 
            className={`px-6 py-2.5 rounded-full font-medium transition-all ${
              location.pathname === '/booking' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            Booking
          </Link>
        </nav>

        {/* Auth Section */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              {/* Shopping Cart */}
              <Link
                to="/cart"
                className="relative flex items-center gap-1 text-gray-700 hover:text-blue-600 transition"
              >
                <span className="text-2xl">🛒</span>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium transition"
                >
                  <span>👤</span>
                  <span className="hidden sm:inline">{user.displayName || user.email?.split('@')[0]}</span>
                  <span>▼</span>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-gray-200 py-2">
                    {/* User Info */}
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">
                        {user.displayName || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>

                    {/* Menu Items */}
                    <Link
                      to="/profile/edit"
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <span>⚙️</span>
                      <span>Edit Profile</span>
                    </Link>
                    <Link
                      to="/appointments"
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <span>📅</span>
                      <span>My Appointments</span>
                    </Link>
                    <Link
                      to="/orders"
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <span>📦</span>
                      <span>My Orders</span>
                    </Link>
                    <hr className="my-2" />
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        handleLogout()
                      }}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 transition"
                    >
                      <span>🚪</span>
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-6 py-2 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-medium transition shadow-sm"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Hamburger Menu Dropdown */}
      {showMobileMenu && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg">
          <nav className="flex flex-col">
            <Link 
              to="/" 
              onClick={() => setShowMobileMenu(false)}
              className={`px-6 py-3 font-medium transition-all border-l-4 ${
                location.pathname === '/' 
                  ? 'border-blue-600 bg-blue-50 text-blue-700' 
                  : 'border-transparent text-gray-700 hover:bg-gray-50'
              }`}
            >
              Home
            </Link>
            <Link 
              to="/services" 
              onClick={() => setShowMobileMenu(false)}
              className={`px-6 py-3 font-medium transition-all border-l-4 ${
                location.pathname === '/services' 
                  ? 'border-blue-600 bg-blue-50 text-blue-700' 
                  : 'border-transparent text-gray-700 hover:bg-gray-50'
              }`}
            >
              Potong Rambut
            </Link>
            <Link 
              to="/products" 
              onClick={() => setShowMobileMenu(false)}
              className={`px-6 py-3 font-medium transition-all border-l-4 ${
                location.pathname === '/products' 
                  ? 'border-blue-600 bg-blue-50 text-blue-700' 
                  : 'border-transparent text-gray-700 hover:bg-gray-50'
              }`}
            >
              Produk
            </Link>
            <Link 
              to="/booking" 
              onClick={() => setShowMobileMenu(false)}
              className={`px-6 py-3 font-medium transition-all border-l-4 ${
                location.pathname === '/booking' 
                  ? 'border-blue-600 bg-blue-50 text-blue-700' 
                  : 'border-transparent text-gray-700 hover:bg-gray-50'
              }`}
            >
              Booking
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
