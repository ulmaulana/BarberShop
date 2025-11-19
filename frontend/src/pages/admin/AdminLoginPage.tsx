import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { adminAuth, adminFirestore } from '../../config/firebaseAdmin'
import { useToast } from '../../contexts/ToastContext'

export function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const { showToast } = useToast()
  
  // Redirect jika sudah login sebagai admin (menggunakan adminAuth)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(adminAuth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(adminFirestore, 'users', user.uid))
          if (userDoc.exists() && userDoc.data().role === 'admin') {
            navigate('/adminpanel/dashboard', { replace: true })
          }
        } catch (error) {
          console.error('Error checking admin status:', error)
        }
      }
    })
    
    return () => unsubscribe()
  }, [navigate])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      showToast('Email and password are required', 'error')
      return
    }
    
    try {
      setLoading(true)
      
      // Sign in dengan Firebase Auth (Admin)
      const userCredential = await signInWithEmailAndPassword(adminAuth, email, password)
      const user = userCredential.user
      
      // Check role di Firestore (Admin)
      const userDoc = await getDoc(doc(adminFirestore, 'users', user.uid))
      
      if (!userDoc.exists()) {
        await adminAuth.signOut()
        showToast('User data not found', 'error')
        return
      }
      
      const userData = userDoc.data()
      
      // Verify role adalah admin
      if (userData.role !== 'admin') {
        await adminAuth.signOut()
        showToast('Access denied. Admin access only.', 'error')
        return
      }
      
      // Check email verification
      if (!user.emailVerified) {
        showToast('Please verify your email first', 'error')
        return
      }
      
      // Success - redirect ke admin dashboard
      showToast('Welcome back, Admin!', 'success')
      navigate('/adminpanel/dashboard')
      
    } catch (error: any) {
      console.error('Login error:', error)
      
      if (error.code === 'auth/invalid-credential') {
        showToast('Invalid email or password', 'error')
      } else if (error.code === 'auth/user-not-found') {
        showToast('User not found', 'error')
      } else if (error.code === 'auth/wrong-password') {
        showToast('Invalid password', 'error')
      } else if (error.code === 'auth/too-many-requests') {
        showToast('Too many failed attempts. Try again later.', 'error')
      } else {
        showToast('Login failed. Please try again.', 'error')
      }
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">💈</div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Sahala Barber
          </h1>
          <p className="text-gray-400">Admin Panel Login</p>
        </div>
        
        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Admin Access Only
          </h2>
          
          {/* Warning Banner */}
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-sm text-red-800 font-semibold mb-2">
              ⚠️ PENTING: Admin Panel - Akses Terbatas
            </p>
            <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
              <li>Hanya untuk administrator yang terauthorisasi</li>
              <li>Semua aktivitas login tercatat</li>
            </ul>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="admin@sahalabarber.com"
                disabled={loading}
                autoComplete="email"
                autoFocus
              />
            </div>
            
            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                  placeholder="Enter your password"
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Signing in...
                </span>
              ) : (
                'Sign In to Admin Panel'
              )}
            </button>
          </form>
          
          {/* Footer Info */}
          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-gray-500">
              Need help? Contact system administrator
            </p>
          </div>
        </div>
        
        {/* Back to Home */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white transition text-sm"
          >
            ← Back to Homepage
          </button>
        </div>
      </div>
    </div>
  )
}
