import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendEmailVerification } from 'firebase/auth'
import { customerAuth } from '../../config/firebaseCustomer'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { handleError } from '../../utils/error'

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleResend = async () => {
    if (!customerAuth.currentUser) return
    
    setLoading(true)
    try {
      await sendEmailVerification(customerAuth.currentUser)
      showToast('Email verifikasi telah dikirim ulang', 'success')
    } catch (error) {
      showToast(handleError(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckVerification = () => {
    customerAuth.currentUser?.reload().then(() => {
      if (customerAuth.currentUser?.emailVerified) {
        showToast('Email berhasil diverifikasi!', 'success')
        navigate('/dashboard')
      } else {
        showToast('Email belum diverifikasi. Silakan cek email Anda.', 'warning')
      }
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4 py-12">
      <Card className="w-full max-w-lg text-center shadow-xl border-2 border-blue-100">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
          <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="mb-3 text-3xl font-bold text-gray-900">Verifikasi Email Anda</h1>
        
        {/* Main Message */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-gray-700 leading-relaxed">
            Kami telah mengirim email verifikasi ke:
          </p>
          <p className="text-lg font-semibold text-blue-600 mt-2 break-all">
            {user?.email}
          </p>
        </div>

        {/* Instructions */}
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            Langkah Verifikasi:
          </h3>
          <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
            <li>Buka email Anda dan cari email dari <strong>Sahala Barber</strong></li>
            <li><strong>Cek folder Inbox</strong> atau <strong>Spam/Junk</strong> jika tidak ada di inbox</li>
            <li>Klik link verifikasi di dalam email</li>
            <li>Kembali ke halaman ini dan klik tombol "Saya Sudah Verifikasi"</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button onClick={handleCheckVerification} className="w-full bg-blue-600 hover:bg-blue-700 text-base py-3">
            ✓ Saya Sudah Verifikasi
          </Button>
          
          <Button 
            onClick={handleResend} 
            variant="secondary" 
            className="w-full text-base py-3"
            isLoading={loading}
          >
            📧 Kirim Ulang Email Verifikasi
          </Button>

          <Button 
            onClick={logout} 
            variant="ghost" 
            className="w-full text-base py-3"
          >
            ← Logout
          </Button>
        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            💡 <strong>Tips:</strong> Email verifikasi biasanya tiba dalam 1-2 menit. 
            Jika tidak menerima, periksa folder spam atau klik "Kirim Ulang Email Verifikasi".
          </p>
        </div>
      </Card>
    </div>
  )
}
