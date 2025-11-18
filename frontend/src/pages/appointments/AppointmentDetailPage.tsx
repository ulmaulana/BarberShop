import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { firestore } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { formatCurrency } from '../../utils/format'

interface Appointment {
  id: string
  userId: string
  serviceId: string
  date: string
  time: string
  notes?: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  createdAt: string
  cancelledAt?: string
  // Populated data
  serviceName?: string
  servicePrice?: number
  serviceDuration?: number
}

export function AppointmentDetailPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/appointments')
      return
    }
    if (appointmentId) {
      loadAppointment()
    }
  }, [appointmentId, user])

  const loadAppointment = async () => {
    if (!appointmentId) return

    try {
      setLoading(true)
      const appointmentDoc = await getDoc(doc(firestore, 'appointments', appointmentId))
      
      if (!appointmentDoc.exists()) {
        showToast('Appointment tidak ditemukan', 'error')
        navigate('/appointments')
        return
      }

      const data = appointmentDoc.data()
      
      // Check if user owns this appointment
      if (data.userId !== user?.uid) {
        showToast('Akses tidak diizinkan', 'error')
        navigate('/appointments')
        return
      }

      // Populate service data
      let serviceData = null
      if (data.serviceId) {
        const serviceDoc = await getDoc(doc(firestore, 'services', data.serviceId))
        if (serviceDoc.exists()) {
          serviceData = serviceDoc.data()
        }
      }

      setAppointment({
        id: appointmentDoc.id,
        ...data,
        serviceName: serviceData?.name,
        servicePrice: serviceData?.price,
        serviceDuration: serviceData?.durationMinutes,
      } as Appointment)
    } catch (error) {
      console.error('Error loading appointment:', error)
      showToast('Gagal memuat appointment', 'error')
      navigate('/appointments')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelAppointment = async () => {
    if (!appointmentId) return

    setCancelling(true)
    try {
      await updateDoc(doc(firestore, 'appointments', appointmentId), {
        status: 'cancelled',
        cancelledAt: new Date().toISOString()
      })
      showToast('Appointment berhasil dibatalkan', 'success')
      navigate('/appointments')
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      showToast('Gagal membatalkan appointment', 'error')
    } finally {
      setCancelling(false)
      setShowCancelModal(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    
    const icons = {
      pending: '⏳',
      confirmed: '✅',
      completed: '🎉',
      cancelled: '❌'
    }
    
    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${styles[status as keyof typeof styles]}`}>
        <span>{icons[status as keyof typeof icons]}</span>
        <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Appointment Not Found</h2>
          <Link to="/appointments" className="text-blue-600 hover:underline">
            Back to Appointments
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/appointments"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            ← Back to Appointments
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Appointment Details</h1>
            {getStatusBadge(appointment.status)}
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Date & Time Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-6xl">📅</div>
              <div>
                <h2 className="text-2xl font-bold mb-1">{formatDate(appointment.date)}</h2>
                <p className="text-blue-100 text-lg">{appointment.time}</p>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="p-8 space-y-6">
            {/* Service Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Information</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">✂️</div>
                  <div>
                    <p className="text-sm text-gray-600">Service</p>
                    <p className="text-lg font-semibold text-gray-900">{appointment.serviceName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⏱️</div>
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="text-lg font-semibold text-gray-900">{appointment.serviceDuration} minutes</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">💰</div>
                  <div>
                    <p className="text-sm text-gray-600">Price</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {formatCurrency(appointment.servicePrice || 0)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">💈</div>
                  <div>
                    <p className="text-sm text-gray-600">Barber</p>
                    <p className="text-lg font-semibold text-gray-900">Auto-assigned</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {appointment.notes && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700">{appointment.notes}</p>
                </div>
              </div>
            )}

            {/* Booking Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Booking Information</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Booked on:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(appointment.createdAt).toLocaleString()}
                  </span>
                </div>
                {appointment.cancelledAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cancelled on:</span>
                    <span className="font-medium text-red-600">
                      {new Date(appointment.cancelledAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
            <div className="flex flex-wrap gap-3">
              {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                <>
                  <Link
                    to={`/appointments/${appointment.id}/reschedule`}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
                  >
                    Reschedule Appointment
                  </Link>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="px-6 py-3 border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-50 font-medium transition"
                  >
                    Cancel Appointment
                  </button>
                </>
              )}
              {appointment.status === 'completed' && (
                <Link
                  to={`/appointments/${appointment.id}/review`}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
                >
                  Write a Review
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Cancel Appointment?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel your appointment on {formatDate(appointment.date)} at {appointment.time}?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition disabled:opacity-50"
              >
                Keep Appointment
              </button>
              <button
                onClick={handleCancelAppointment}
                disabled={cancelling}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
