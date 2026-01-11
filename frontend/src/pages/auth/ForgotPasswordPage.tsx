import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { handleError } from '../../utils/error'
import { validateEmail, validateRequired } from '../../utils/validation'

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const { showToast } = useToast()

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const validate = () => {
    if (!validateRequired(email)) {
      setError('Email wajib diisi')
      return false
    }
    if (!validateEmail(email)) {
      setError('Format email tidak valid')
      return false
    }
    setError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)
    try {
      await resetPassword(email)
      setSuccess(true)
      showToast('Link reset password telah dikirim ke email Anda', 'success')
    } catch (error) {
      showToast(handleError(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
        <Card className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">Email Terkirim</h2>
          <p className="mb-6 text-gray-600">
            Kami telah mengirim link reset password ke <strong>{email}</strong>. Silakan cek email Anda.
          </p>
          <Link to="/login">
            <Button className="w-full">Kembali ke Login</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Lupa Password</h1>
          <p className="mt-2 text-sm text-gray-600">
            Masukkan email Anda untuk menerima link reset password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
            placeholder="nama@email.com"
            required
          />

          <Button type="submit" className="w-full" isLoading={loading}>
            Kirim Link Reset
          </Button>

          <div className="text-center">
            <Link to="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              Kembali ke Login
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}
