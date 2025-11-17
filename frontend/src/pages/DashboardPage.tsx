import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      if (user.role === 'barber') {
        navigate('/barber/dashboard', { replace: true })
      } else if (user.role === 'cashier') {
        navigate('/cashier/dashboard', { replace: true })
      } else if (user.role === 'owner' || user.role === 'admin') {
        navigate('/owner/dashboard', { replace: true })
      }
    }
  }, [user, navigate])

  const roleGreetings: Record<string, string> = {
    customer: 'Selamat datang! Anda dapat membuat appointment atau bergabung dengan antrian.',
    barber: 'Selamat datang, Barber! Kelola appointment dan antrian pelanggan Anda.',
    cashier: 'Selamat datang, Kasir! Kelola transaksi dan pesanan produk.',
    owner: 'Selamat datang, Owner! Lihat analitik dan kelola seluruh operasional.',
    admin: 'Selamat datang, Admin! Anda memiliki akses penuh ke semua fitur sistem.',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          {roleGreetings[user?.role || 'customer']}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Nama:</span> {user?.displayName || 'N/A'}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Email:</span> {user?.email}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Role:</span>{' '}
                <span className="capitalize">{user?.role}</span>
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Status Email:</span>{' '}
                {user?.emailVerified ? (
                  <span className="text-green-600">✓ Terverifikasi</span>
                ) : (
                  <span className="text-yellow-600">⚠ Belum Terverifikasi</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {user?.role === 'customer' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Appointment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Buat appointment baru atau lihat riwayat appointment Anda.
                </p>
                <a
                  href="/appointments"
                  className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Lihat Appointment →
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Antrian</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Bergabung dengan antrian untuk layanan walk-in.
                </p>
                <a
                  href="/queue"
                  className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Lihat Antrian →
                </a>
              </CardContent>
            </Card>
          </>
        )}

        {(user?.role === 'barber' || user?.role === 'owner' || user?.role === 'admin') && (
          <Card>
            <CardHeader>
              <CardTitle>Kelola Appointment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Lihat dan kelola appointment pelanggan Anda.
              </p>
              <a
                href="/appointments"
                className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Kelola Appointment →
              </a>
            </CardContent>
          </Card>
        )}

        {(user?.role === 'owner' || user?.role === 'admin') && (
          <Card>
            <CardHeader>
              <CardTitle>Analitik</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Lihat statistik dan performa bisnis Anda.
              </p>
              <a
                href="/analytics"
                className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Lihat Analitik →
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
