import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { sendEmailVerification } from 'firebase/auth'
import { firebaseAuth } from '../../config/firebase'
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
    if (!firebaseAuth.currentUser) return
    
    setLoading(true)
    try {
      await sendEmailVerification(firebaseAuth.currentUser)
      showToast('Email verifikasi telah dikirim ulang', 'success')
    } catch (error) {
      showToast(handleError(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckVerification = () => {
    firebaseAuth.currentUser?.reload().then(() => {
      if (firebaseAuth.currentUser?.emailVerified) {
        showToast('Email berhasil diverifikasi!', 'success')
        navigate('/dashboard')
      } else {
        showToast('Email belum diverifikasi. Silakan cek email Anda.', 'warning')
      }
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-gray-900">Verifikasi Email Anda</h1>
        <p className="mb-6 text-gray-600">
          Kami telah mengirim email verifikasi ke <strong>{user?.email}</strong>. Silakan cek inbox atau folder spam Anda.
        </p>

        <div className="space-y-3">
          <Button onClick={handleCheckVerification} className="w-full">
            Saya Sudah Verifikasi
          </Button>
          
          <Button 
            onClick={handleResend} 
            variant="secondary" 
            className="w-full"
            isLoading={loading}
          >
            Kirim Ulang Email
          </Button>

          <Button 
            onClick={logout} 
            variant="ghost" 
            className="w-full"
          >
            Logout
          </Button>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>Tidak menerima email? Periksa folder spam atau coba kirim ulang.</p>
        </div>
      </Card>
    </div>
  )
}
