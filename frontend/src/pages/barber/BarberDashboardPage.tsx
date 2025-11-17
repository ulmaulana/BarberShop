import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { FirebaseService } from '../../services/firebase.service'
import { formatDateTime } from '../../utils/date'
import { handleError } from '../../utils/error'
import type { Appointment, Barber } from '../../types'

const appointmentsService = new FirebaseService('appointments')
const barbersService = new FirebaseService('barbers')

export function BarberDashboardPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [barberProfile, setBarberProfile] = useState<Barber | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    if (!user) return
    
    try {
      // Find barber profile by userId
      const barberConstraint = FirebaseService.where('userId', '==', user.uid)
      const barbersData = await barbersService.query([barberConstraint])
      const barber = barbersData[0] as Barber
      
      if (barber) {
        setBarberProfile(barber)
        
        // Load appointments for this barber
        const appointmentConstraints = [
          FirebaseService.where('barberId', '==', barber.id),
          FirebaseService.orderBy('startTime', 'desc'),
        ]
        const appointmentsData = await appointmentsService.query(appointmentConstraints)
        setAppointments(appointmentsData as Appointment[])
      }
    } catch (error) {
      showToast(handleError(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      await appointmentsService.update(appointmentId, { status })
      showToast('Status appointment berhasil diupdate', 'success')
      await loadData()
    } catch (error) {
      showToast(handleError(error), 'error')
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />
  }

  if (!barberProfile) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">Profil barber tidak ditemukan.</p>
      </div>
    )
  }

  const todayAppointments = appointments.filter(
    (apt) => new Date(apt.startTime).toDateString() === new Date().toDateString()
  )
  const upcomingAppointments = appointments.filter(
    (apt) => new Date(apt.startTime) > new Date() && apt.status !== 'cancelled'
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Barber</h1>
        <p className="mt-2 text-gray-600">Kelola appointment dan jadwal Anda</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-600">Appointment Hari Ini</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{todayAppointments.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-600">Appointment Mendatang</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{upcomingAppointments.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-600">Rating Anda</h3>
            <p className="mt-2 text-3xl font-bold text-yellow-600">
              {barberProfile.rating.toFixed(1)} ⭐
            </p>
            <p className="text-sm text-gray-600">{barberProfile.totalReviews} ulasan</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointment Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <p className="py-8 text-center text-gray-600">Tidak ada appointment hari ini.</p>
          ) : (
            <div className="space-y-4">
              {todayAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatDateTime(appointment.startTime)}
                    </p>
                    <p className="text-sm text-gray-600">Customer ID: {appointment.customerId}</p>
                    <p className="text-sm text-gray-600">Service ID: {appointment.serviceId}</p>
                    {appointment.notes && (
                      <p className="mt-1 text-sm text-gray-500">Catatan: {appointment.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {appointment.status === 'confirmed' && (
                      <Button
                        size="sm"
                        onClick={() => updateAppointmentStatus(appointment.id, 'in_progress')}
                      >
                        Mulai
                      </Button>
                    )}
                    {appointment.status === 'in_progress' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                      >
                        Selesai
                      </Button>
                    )}
                    {appointment.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                        >
                          Konfirmasi
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                        >
                          Tolak
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appointment Mendatang</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length === 0 ? (
            <p className="py-8 text-center text-gray-600">Tidak ada appointment mendatang.</p>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.slice(0, 5).map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatDateTime(appointment.startTime)}
                    </p>
                    <p className="text-sm text-gray-600">Customer ID: {appointment.customerId}</p>
                    <p className="text-sm capitalize text-gray-600">Status: {appointment.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
