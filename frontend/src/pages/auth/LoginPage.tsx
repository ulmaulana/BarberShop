import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { handleError } from '../../utils/error'
import { validateEmail, validateRequired } from '../../utils/validation'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, login } = useAuth()
  const { showToast } = useToast()
  
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      // Check if user is admin - redirect to admin panel
      if (user.role === 'admin') {
        showToast('Mengalihkan ke Panel Admin...', 'info')
        navigate('/adminpanel/dashboard', { replace: true })
        return
      }
      
      // Regular customer redirect
      const redirectTo = searchParams.get('redirect') || '/'
      navigate(redirectTo, { replace: true })
    }
  }, [user, navigate, searchParams, showToast])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!validateRequired(formData.email)) {
      newErrors.email = 'Email wajib diisi'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Format email tidak valid'
    }
    
    if (!validateRequired(formData.password)) {
      newErrors.password = 'Password wajib diisi'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return
    
    setLoading(true)
    try {
      await login(formData.email, formData.password)
      showToast('Login berhasil', 'success')
      
      // Auth state will update via useEffect
      // Role-based redirect handled there
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
          <h1 className="text-2xl font-bold text-gray-900">Masuk ke Sahala Barber</h1>
          <p className="mt-2 text-sm text-gray-600">
            Belum punya akun?{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
              Daftar sekarang
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={errors.password}
            placeholder="Masukkan password"
            required
          />

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                Lupa password?
              </Link>
            </div>
          </div>

          <Button type="submit" className="w-full" isLoading={loading}>
            Masuk
          </Button>
        </form>
      </Card>
    </div>
  )
}
