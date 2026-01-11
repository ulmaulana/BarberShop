import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { handleError } from '../../utils/error'
import { validateEmail, validatePassword, validateRequired, validatePhone } from '../../utils/validation'

export function RegisterPage() {
  const navigate = useNavigate()
  const { user, register } = useAuth()
  const { showToast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!validateRequired(formData.name)) {
      newErrors.name = 'Nama wajib diisi'
    }

    if (!validateRequired(formData.email)) {
      newErrors.email = 'Email wajib diisi'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Format email tidak valid'
    }

    if (!validateRequired(formData.phone)) {
      newErrors.phone = 'Nomor HP wajib diisi'
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Format nomor HP tidak valid'
    }

    const passwordValidation = validatePassword(formData.password)
    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.message || 'Password tidak valid'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Password tidak sama'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)
    try {
      await register(formData.email, formData.password, formData.name)
      showToast('Registrasi berhasil! Silakan cek email untuk verifikasi.', 'success')
      navigate('/verify-email')
    } catch (error) {
      showToast(handleError(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Daftar Akun Baru</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sudah punya akun?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Masuk di sini
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nama Lengkap"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            placeholder="John Doe"
            required
          />

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            placeholder="nama@email.com"
            required
          />

          <Input
            label="Nomor HP"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            error={errors.phone}
            placeholder="08123456789"
            required
          />

          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={errors.password}
            placeholder="Minimal 6 karakter"
            required
          />

          <Input
            label="Konfirmasi Password"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            error={errors.confirmPassword}
            placeholder="Ulangi password"
            required
          />

          <Button type="submit" className="w-full" isLoading={loading}>
            Daftar
          </Button>
        </form>
      </Card>
    </div>
  )
}
