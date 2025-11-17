import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { FirebaseService } from '../../services/firebase.service'
import { formatDateTime } from '../../utils/date'
import { handleError } from '../../utils/error'
import type { Appointment } from '../../types'

const appointmentsService = new FirebaseService('appointments')

export function AppointmentsListPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadAppointments()
    }
  }, [user])

  const loadAppointments = async () => {
    if (!user) return
    
    try {
      const constraints = FirebaseService.where('customerId', '==', user.uid)
      const data = await appointmentsService.query([constraints])
      setAppointments(data as Appointment[])
    } catch (error) {
      showToast(handleError(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      no_show: 'bg-gray-100 text-gray-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Menunggu',
      confirmed: 'Dikonfirmasi',
      in_progress: 'Sedang Berlangsung',
      completed: 'Selesai',
      cancelled: 'Dibatalkan',
      no_show: 'Tidak Hadir',
    }
    return labels[status] || status
  }

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appointment Saya</h1>
          <p className="mt-2 text-gray-600">Riwayat dan status appointment Anda</p>
        </div>
        <Link to="/appointments/new">
          <Button>Buat Appointment Baru</Button>
        </Link>
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-4 text-gray-600">Anda belum memiliki appointment.</p>
            <Link to="/appointments/new">
              <Button>Buat Appointment Pertama</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <Card key={appointment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Appointment #{appointment.id.slice(0, 8)}
                      </h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {getStatusLabel(appointment.status)}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">Waktu:</span> {formatDateTime(appointment.startTime)}
                      </p>
                      <p>
                        <span className="font-medium">Service ID:</span> {appointment.serviceId}
                      </p>
                      <p>
                        <span className="font-medium">Barber ID:</span> {appointment.barberId}
                      </p>
                      {appointment.notes && (
                        <p>
                          <span className="font-medium">Catatan:</span> {appointment.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {appointment.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary">
                        Ubah
                      </Button>
                      <Button size="sm" variant="danger">
                        Batal
                      </Button>
                    </div>
                  )}
                  
                  {appointment.status === 'completed' && (
                    <Link to={`/appointments/${appointment.id}/review`}>
                      <Button size="sm">
                        Beri Review
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
