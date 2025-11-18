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
      showToast('Admin harus menggunakan Panel Admin!', 'error')
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
      showToast('Gagal memuat appointment', 'error')
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
      showToast('Appointment berhasil dibatalkan', 'success')
      setShowCancelModal(false)
      setSelectedAppointment(null)
      loadAppointments()
    } catch (error) {
      showToast('Gagal membatalkan appointment', 'error')
    }
  }

  const filteredAppointments = appointments.filter((apt) => {
    if (activeTab === 'upcoming') {
      // Show pending or confirmed appointments (regardless of date for now)
      const isUpcoming = apt.status === 'pending' || apt.status === 'confirmed'
      console.log('Appointment:', apt.id, 'Status:', apt.status, 'Is Upcoming:', isUpcoming)
      return isUpcoming
    } else if (activeTab === 'completed') {
      return apt.status === 'completed'
    } else {
      return apt.status === 'cancelled'
    }
  })

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('id-ID', { 
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
    
    const labels = {
      pending: 'Menunggu',
      confirmed: 'Dikonfirmasi',
      completed: 'Selesai',
      cancelled: 'Dibatalkan'
    }
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels] || status}
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Appointment Saya</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Kelola jadwal appointment barbershop Anda</p>
          </div>
          <Link
            to="/booking"
            className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-sm text-center text-sm sm:text-base whitespace-nowrap"
          >
            + Buat Appointment
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 sm:gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
          {[
            { key: 'upcoming', label: 'Akan Datang' },
            { key: 'completed', label: 'Selesai' },
            { key: 'cancelled', label: 'Dibatalkan' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`px-4 sm:px-6 py-2 sm:py-3 font-medium transition-colors border-b-2 text-sm sm:text-base whitespace-nowrap ${
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
              Tidak ada appointment {activeTab === 'upcoming' ? 'yang akan datang' : activeTab === 'completed' ? 'selesai' : 'dibatalkan'}
            </h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'upcoming' 
                ? "Anda belum memiliki appointment. Buat sekarang!"
                : `Anda tidak memiliki appointment ${activeTab === 'completed' ? 'selesai' : 'dibatalkan'}.`
              }
            </p>
            {activeTab === 'upcoming' && (
              <Link
                to="/booking"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
              >
                Buat Appointment
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl sm:text-4xl">📅</div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                        {formatDate(appointment.date)} - {appointment.time}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600">
                        Dibuat {new Date(appointment.createdAt).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(appointment.status)}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4 mb-4">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Layanan:</p>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">{appointment.serviceName}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Barber:</p>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">
                      {appointment.barberName} ({appointment.barberRating}⭐)
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Durasi:</p>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">{appointment.serviceDuration} menit</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Harga:</p>
                    <p className="font-semibold text-blue-600 text-sm sm:text-base">
                      {formatCurrency(appointment.servicePrice || 0)}
                    </p>
                  </div>
                </div>

                {appointment.notes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Catatan:</p>
                    <p className="text-xs sm:text-sm text-gray-900">{appointment.notes}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-200">
                  <Link
                    to={`/appointments/${appointment.id}`}
                    className="px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition text-xs sm:text-sm text-center"
                  >
                    Lihat Detail
                  </Link>
                  
                  {activeTab === 'upcoming' && (
                    <>
                      <Link
                        to={`/appointments/${appointment.id}/reschedule`}
                        className="px-3 sm:px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium transition text-xs sm:text-sm text-center"
                      >
                        Ubah Jadwal
                      </Link>
                      <button
                        onClick={() => {
                          setSelectedAppointment(appointment)
                          setShowCancelModal(true)
                        }}
                        className="px-3 sm:px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 font-medium transition text-xs sm:text-sm"
                      >
                        Batalkan
                      </button>
                    </>
                  )}

                  {activeTab === 'completed' && (
                    <Link
                      to={`/appointments/${appointment.id}/review`}
                      className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition text-xs sm:text-sm text-center"
                    >
                      Tulis Review
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
              Batalkan Appointment?
            </h3>
            <p className="text-gray-600 mb-6">
              Apakah Anda yakin ingin membatalkan appointment pada {formatDate(selectedAppointment.date)} pukul {selectedAppointment.time}?
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setSelectedAppointment(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
              >
                Tetap Simpan
              </button>
              <button
                onClick={() => handleCancelAppointment(selectedAppointment.id)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition"
              >
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
