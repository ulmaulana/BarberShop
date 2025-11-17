import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore'
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
  // Populated data
  serviceName?: string
  servicePrice?: number
  serviceDuration?: number
  barberName?: string
  barberRating?: number
}

type TabType = 'upcoming' | 'completed' | 'cancelled'

export function MyAppointmentsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('upcoming')
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)

  // GUARD: Redirect admin to admin panel
  useEffect(() => {
    if (user && user.role === 'admin') {
      console.warn('🚨 ADMIN in MyAppointmentsPage - REDIRECTING')
      showToast('Admin should use Admin Panel!', 'error')
      navigate('/adminpanel/dashboard', { replace: true })
    }
  }, [user, navigate, showToast])

  useEffect(() => {
    if (user && user.role !== 'admin') {
      loadAppointments()
    }
  }, [user])

  const loadAppointments = async () => {
    if (!user) return

    try {
      setLoading(true)
      const appointmentsRef = collection(firestore, 'appointments')
      const q = query(appointmentsRef, where('userId', '==', user.uid))
      const snapshot = await getDocs(q)
      
      const appointmentsData = await Promise.all(
        snapshot.docs.map(async (appointmentDoc) => {
          const data = appointmentDoc.data()
          
          // Populate service data
          let serviceData = null
          if (data.serviceId) {
            const serviceDoc = await getDoc(doc(firestore, 'services', data.serviceId))
            if (serviceDoc.exists()) {
              serviceData = serviceDoc.data()
            }
          }
          
          return {
            id: appointmentDoc.id,
            ...data,
            serviceName: serviceData?.name,
            servicePrice: serviceData?.price,
            serviceDuration: serviceData?.durationMinutes,
            barberName: 'Auto-assigned', // Simplified for now
            barberRating: 4.8,
          } as Appointment
        })
      )

      // Sort by date and time (newest first)
      appointmentsData.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`)
        const dateB = new Date(`${b.date} ${b.time}`)
        return dateB.getTime() - dateA.getTime()
      })

      setAppointments(appointmentsData)
    } catch (error) {
      console.error('Error loading appointments:', error)
      showToast('Failed to load appointments', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      await updateDoc(doc(firestore, 'appointments', appointmentId), {
        status: 'cancelled',
        cancelledAt: new Date().toISOString()
      })
      showToast('Appointment cancelled successfully', 'success')
      setShowCancelModal(false)
      setSelectedAppointment(null)
      loadAppointments()
    } catch (error) {
      showToast('Failed to cancel appointment', 'error')
    }
  }

  const filteredAppointments = appointments.filter((apt) => {
    const appointmentDate = new Date(`${apt.date} ${apt.time}`)
    const now = new Date()

    if (activeTab === 'upcoming') {
      return (apt.status === 'pending' || apt.status === 'confirmed') && appointmentDate >= now
    } else if (activeTab === 'completed') {
      return apt.status === 'completed'
    } else {
      return apt.status === 'cancelled'
    }
  })

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
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
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
            <p className="text-gray-600 mt-1">Manage your barbershop appointments</p>
          </div>
          <Link
            to="/booking"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-sm"
          >
            + New Appointment
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {[
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'completed', label: 'Completed' },
            { key: 'cancelled', label: 'Cancelled' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Appointments List */}
        {filteredAppointments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No {activeTab} appointments
            </h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'upcoming' 
                ? "You don't have any upcoming appointments. Book one now!"
                : `You don't have any ${activeTab} appointments.`
              }
            </p>
            {activeTab === 'upcoming' && (
              <Link
                to="/booking"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
              >
                Book Appointment
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">📅</div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {formatDate(appointment.date)} - {appointment.time}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Created {new Date(appointment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(appointment.status)}
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Service:</p>
                    <p className="font-semibold text-gray-900">{appointment.serviceName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Barber:</p>
                    <p className="font-semibold text-gray-900">
                      {appointment.barberName} ({appointment.barberRating}⭐)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Duration:</p>
                    <p className="font-semibold text-gray-900">{appointment.serviceDuration} min</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Price:</p>
                    <p className="font-semibold text-blue-600">
                      {formatCurrency(appointment.servicePrice || 0)}
                    </p>
                  </div>
                </div>

                {appointment.notes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Notes:</p>
                    <p className="text-sm text-gray-900">{appointment.notes}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <Link
                    to={`/appointments/${appointment.id}`}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition text-sm"
                  >
                    View Details
                  </Link>
                  
                  {activeTab === 'upcoming' && (
                    <>
                      <Link
                        to={`/appointments/${appointment.id}/reschedule`}
                        className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium transition text-sm"
                      >
                        Reschedule
                      </Link>
                      <button
                        onClick={() => {
                          setSelectedAppointment(appointment)
                          setShowCancelModal(true)
                        }}
                        className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 font-medium transition text-sm"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {activeTab === 'completed' && (
                    <Link
                      to={`/appointments/${appointment.id}/review`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition text-sm"
                    >
                      Write Review
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Cancel Appointment?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel your appointment on {formatDate(selectedAppointment.date)} at {selectedAppointment.time}?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setSelectedAppointment(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
              >
                Keep Appointment
              </button>
              <button
                onClick={() => handleCancelAppointment(selectedAppointment.id)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
