import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { customerFirestore } from '../../config/firebaseCustomer'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'

export function EditProfilePage() {
  const { user, updateUserProfile } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return
      
      try {
        setLoadingData(true)
        
        // Load phone from Firestore
        const userDoc = await getDoc(doc(customerFirestore, 'users', user.uid))
        const userData = userDoc.data()
        
        setFormData({
          name: user.displayName || '',
          email: user.email || '',
          phone: userData?.phone || '',
        })
      } catch (error) {
        console.error('Error loading user data:', error)
        showToast('Gagal memuat data user', 'error')
      } finally {
        setLoadingData(false)
      }
    }
    
    loadUserData()
  }, [user, showToast])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Nama tidak boleh kosong'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email tidak boleh kosong'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid'
    }

    if (formData.phone && !/^[0-9]{10,15}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
      newErrors.phone = 'Nomor HP harus 10-15 digit'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      await updateUserProfile({
        displayName: formData.name,
        email: formData.email,
        phone: formData.phone,
      })
      
      showToast('Profile berhasil diperbarui', 'success')
      navigate(-1) // Go back to previous page
    } catch (error: any) {
      console.error('Update profile error:', error)
      
      if (error.code === 'auth/email-already-in-use') {
        setErrors({ email: 'Email sudah digunakan' })
        showToast('Email sudah digunakan oleh akun lain', 'error')
      } else if (error.code === 'auth/invalid-email') {
        setErrors({ email: 'Format email tidak valid' })
        showToast('Format email tidak valid', 'error')
      } else if (error.code === 'auth/requires-recent-login') {
        showToast('Silakan login ulang untuk mengubah email', 'error')
      } else {
        showToast('Gagal memperbarui profile', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (loadingData) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Memuat data...</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
        <p className="text-gray-600 mt-1">Perbarui informasi akun Anda</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Masukkan nama lengkap"
              disabled={loading}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="email@example.com"
              disabled={loading}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
            {formData.email !== user?.email && (
              <p className="mt-1 text-sm text-yellow-600">
                ⚠️ Mengubah email akan memerlukan verifikasi ulang
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nomor HP
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="08123456789"
              disabled={loading}
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Format: 10-15 digit angka
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              isLoading={loading}
              className="flex-1"
            >
              Simpan Perubahan
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(-1)}
              disabled={loading}
              className="flex-1"
            >
              Batal
            </Button>
          </div>
        </form>
      </Card>

      {/* Info Card */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <span className="text-2xl">ℹ️</span>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">
              Informasi Penting
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Perubahan email memerlukan login ulang</li>
              <li>• Email baru harus diverifikasi</li>
              <li>• Nomor HP digunakan untuk notifikasi booking</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
