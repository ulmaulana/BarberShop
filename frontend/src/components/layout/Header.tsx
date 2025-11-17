import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { firestore } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'

export function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [cartCount, setCartCount] = useState(0)

  // Real-time cart counter
  useEffect(() => {
    if (!user) {
      setCartCount(0)
      return
    }

    const cartRef = collection(firestore, 'cart')
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
    <header className="border-b border-gray-200 bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-gray-900 hover:text-blue-600 transition">
          <span className="text-2xl">💈</span>
          <span>Sahala Barber</span>
        </Link>

        {/* Navigation Menu */}
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-gray-700 hover:text-blue-600 font-medium transition">
            Home
          </Link>
          <Link to="/services" className="text-gray-700 hover:text-blue-600 font-medium transition">
            Services
          </Link>
          <Link to="/products" className="text-gray-700 hover:text-blue-600 font-medium transition">
            Products
          </Link>
          <Link to="/booking" className="text-gray-700 hover:text-blue-600 font-medium transition">
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
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    <Link
                      to="/dashboard"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/appointments"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                      onClick={() => setShowUserMenu(false)}
                    >
                      My Appointments
                    </Link>
                    <Link
                      to="/orders"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                      onClick={() => setShowUserMenu(false)}
                    >
                      My Orders
                    </Link>
                    <hr className="my-2" />
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        handleLogout()
                      }}
                      className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 transition"
                    >
                      Logout
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
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-sm"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      <div className="md:hidden border-t border-gray-200 px-4 py-3 flex justify-around bg-gray-50">
        <Link to="/" className="text-gray-700 hover:text-blue-600 text-sm font-medium">
          Home
        </Link>
        <Link to="/services" className="text-gray-700 hover:text-blue-600 text-sm font-medium">
          Services
        </Link>
        <Link to="/products" className="text-gray-700 hover:text-blue-600 text-sm font-medium">
          Products
        </Link>
        <Link to="/booking" className="text-gray-700 hover:text-blue-600 text-sm font-medium">
          Booking
        </Link>
      </div>
    </header>
  )
}
