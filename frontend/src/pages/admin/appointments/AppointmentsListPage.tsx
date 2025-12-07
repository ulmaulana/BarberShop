import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore'
import { adminFirestore } from '../../../config/firebaseAdmin'
import { useToast } from '../../../contexts/ToastContext'
import { AppointmentsSkeleton } from '../../../components/admin/SkeletonLoader'
import { formatCurrency } from '../../../utils/format'


// API endpoint untuk notifikasi (Vercel serverless function)
const NOTIFICATION_API = import.meta.env.DEV 
  ? '/api/send-notification' 
  : '/api/send-notification'

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
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  serviceName?: string
  servicePrice?: number
  serviceDuration?: number
  hasFcmToken?: boolean
}

type FilterType = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'

interface NotificationModalState {
  isOpen: boolean
  appointment: Appointment | null
  title: string
  body: string
}

export function AppointmentsListPage() {
  const { showToast } = useToast()
  
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sendingNotification, setSendingNotification] = useState<string | null>(null)
  const [notificationModal, setNotificationModal] = useState<NotificationModalState>({
    isOpen: false,
    appointment: null,
    title: '',
    body: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [notifCurrentPage, setNotifCurrentPage] = useState(1)
  const itemsPerPage = 5

  useEffect(() => {
    loadAppointments()
  }, [])

  useEffect(() => {
    filterAppointments()
  }, [appointments, filter, searchQuery])

  const loadAppointments = async () => {
    try {
      setLoading(true)
      const appointmentsRef = collection(adminFirestore, 'appointments')
      const snapshot = await getDocs(appointmentsRef)
      
      const appointmentsData = await Promise.all(
        snapshot.docs.map(async (appointmentDoc) => {
          const data = appointmentDoc.data()
          
          // Populate user data
          let userData: any = null
          if (data.userId) {
            try {
              const userDoc = await getDoc(doc(adminFirestore, 'users', data.userId))
              if (userDoc.exists()) {
                userData = userDoc.data()
              }
            } catch (error) {
              console.error('Error loading user:', error)
            }
          }
          
          // Populate service data
          let serviceData = null
          if (data.serviceId) {
            try {
              const serviceDoc = await getDoc(doc(adminFirestore, 'services', data.serviceId))
              if (serviceDoc.exists()) {
                serviceData = serviceDoc.data()
              }
            } catch (error) {
              console.error('Error loading service:', error)
            }
          }
          
          return {
            id: appointmentDoc.id,
            ...data,
            customerName: userData?.name || userData?.displayName || 'Unknown',
            customerEmail: userData?.email || 'N/A',
            customerPhone: userData?.phone || '',
            serviceName: serviceData?.name || 'Unknown Service',
            servicePrice: serviceData?.price || 0,
            serviceDuration: serviceData?.durationMinutes || 0,
            hasFcmToken: !!userData?.fcmToken,
          } as Appointment
        })
      )

      // Sort: pending/confirmed first (oldest at top for queue), then completed/cancelled at bottom
      appointmentsData.sort((a, b) => {
        // Priority: pending/confirmed > completed/cancelled
        const statusPriority = (status: string) => {
          if (status === 'pending' || status === 'confirmed') return 0
          return 1 // completed, cancelled go to bottom
        }
        
        const priorityA = statusPriority(a.status)
        const priorityB = statusPriority(b.status)
        
        // If different priority, sort by priority
        if (priorityA !== priorityB) {
          return priorityA - priorityB
        }
        
        // Same priority: sort by date/time
        // For active (pending/confirmed): oldest first (antrian)
        // For completed/cancelled: newest first
        const dateA = new Date(`${a.date} ${a.time}`)
        const dateB = new Date(`${b.date} ${b.time}`)
        
        if (priorityA === 0) {
          // Active appointments: oldest first (queue order)
          return dateA.getTime() - dateB.getTime()
        } else {
          // Completed/cancelled: newest first
          return dateB.getTime() - dateA.getTime()
        }
      })

      setAppointments(appointmentsData)
    } catch (error) {
      console.error('Error loading appointments:', error)
      showToast('Failed to load appointments', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filterAppointments = () => {
    let filtered = appointments

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter(a => a.status === filter)
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(a =>
        a.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.serviceName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredAppointments(filtered)
    setCurrentPage(1) // Reset page when filter changes
    setNotifCurrentPage(1)
  }

  // Pagination helpers
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage)
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const notifAppointments = filteredAppointments.filter(a => a.status === 'confirmed' || a.status === 'pending')
  const notifTotalPages = Math.ceil(notifAppointments.length / itemsPerPage)
  const paginatedNotifAppointments = notifAppointments.slice(
    (notifCurrentPage - 1) * itemsPerPage,
    notifCurrentPage * itemsPerPage
  )

  const updateStatus = async (appointmentId: string, newStatus: Appointment['status']) => {
    try {
      setUpdating(appointmentId)
      await updateDoc(doc(adminFirestore, 'appointments', appointmentId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      })
      
      setAppointments(appointments.map(a =>
        a.id === appointmentId ? { ...a, status: newStatus } : a
      ))
      
      showToast(`Appointment ${newStatus}`, 'success')
    } catch (error) {
      console.error('Error updating appointment:', error)
      showToast('Failed to update appointment', 'error')
    } finally {
      setUpdating(null)
    }
  }

  const getStatusBadge = (status: Appointment['status']) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return styles[status]
  }

  const getStatusLabel = (status: Appointment['status']) => {
    const labels = {
      pending: 'Menunggu',
      confirmed: 'Dikonfirmasi',
      completed: 'Selesai',
      cancelled: 'Dibatalkan',
    }
    return labels[status]
  }

  // Open notification modal with pre-filled content
  const openNotificationModal = (appointment: Appointment) => {
    const queuePosition = filteredAppointments
      .filter(a => a.status === 'confirmed' || a.status === 'pending')
      .findIndex(a => a.id === appointment.id) + 1

    setNotificationModal({
      isOpen: true,
      appointment,
      title: 'Giliran Anda Sudah Dekat!',
      body: `Hai ${appointment.customerName}, giliran antrian Anda sudah dekat (posisi ${queuePosition}). Silakan segera datang ke Sahala Barber!`
    })
  }

  // Send notification to customer via Vercel API
  const sendNotification = async () => {
    if (!notificationModal.appointment) return

    const { appointment, title, body } = notificationModal
    setSendingNotification(appointment.id)

    try {
      const response = await fetch(NOTIFICATION_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: appointment.userId,
          title,
          body,
          appointmentId: appointment.id
        })
      })

      // Check if response has content before parsing JSON
      const contentType = response.headers.get('content-type')
      let result = { error: 'Unknown error' }
      
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text()
        if (text) {
          result = JSON.parse(text)
        }
      }
      
      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`)
      }

      showToast(`Notifikasi berhasil dikirim ke ${appointment.customerName}`, 'success')
      setNotificationModal({ isOpen: false, appointment: null, title: '', body: '' })
    } catch (error: any) {
      console.error('Error sending notification:', error)
      showToast(error.message || 'Gagal mengirim notifikasi', 'error')
    } finally {
      setSendingNotification(null)
    }
  }

  // Quick send notification (default message) via Vercel API
  const quickSendNotification = async (appointment: Appointment) => {
    if (!appointment.hasFcmToken) {
      showToast('Customer belum mengaktifkan notifikasi', 'error')
      return
    }

    const queuePosition = filteredAppointments
      .filter(a => a.status === 'confirmed' || a.status === 'pending')
      .findIndex(a => a.id === appointment.id) + 1

    setSendingNotification(appointment.id)

    try {
      const response = await fetch(NOTIFICATION_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: appointment.userId,
          title: 'Giliran Anda Sudah Dekat!',
          body: `Hai ${appointment.customerName}, giliran antrian Anda sudah dekat (posisi ${queuePosition}). Silakan segera datang ke Sahala Barber!`,
          appointmentId: appointment.id,
          queueNumber: queuePosition
        })
      })

      // Check if response has content before parsing JSON
      const contentType = response.headers.get('content-type')
      let result = { error: 'Unknown error' }
      
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text()
        if (text) {
          result = JSON.parse(text)
        }
      }
      
      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`)
      }

      showToast(`Notifikasi berhasil dikirim ke ${appointment.customerName}`, 'success')
    } catch (error: any) {
      console.error('Error sending notification:', error)
      showToast(error.message || 'Gagal mengirim notifikasi', 'error')
    } finally {
      setSendingNotification(null)
    }
  }

  if (loading) {
    return <AppointmentsSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Booking</h1>
        <p className="text-gray-500 mt-1">Kelola Booking pelanggan</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-800">{appointments.length}</p>
            </div>
            <div className="text-3xl">📅</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Menunggu</p>
              <p className="text-2xl font-bold text-yellow-600">
                {appointments.filter(a => a.status === 'pending').length}
              </p>
            </div>
            <div className="text-3xl">⏳</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Dikonfirmasi</p>
              <p className="text-2xl font-bold text-blue-600">
                {appointments.filter(a => a.status === 'confirmed').length}
              </p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Selesai</p>
              <p className="text-2xl font-bold text-green-600">
                {appointments.filter(a => a.status === 'completed').length}
              </p>
            </div>
            <div className="text-3xl">🎉</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Cari berdasarkan pelanggan atau layanan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as FilterType[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Info */}
      <div className="text-sm text-gray-600">
        Menampilkan <span className="font-semibold text-gray-900">{filteredAppointments.length}</span> dari {appointments.length} Booking
      </div>

      {/* Appointments Table */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">&#128197;</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Tidak ada Booking</h3>
          <p className="text-gray-600">Coba sesuaikan filter Anda</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pelanggan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Layanan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal & Waktu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedAppointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {appointment.customerName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {appointment.customerEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {appointment.serviceName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(appointment.servicePrice || 0)} - {appointment.serviceDuration}min
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{appointment.date}</div>
                      <div className="text-sm text-gray-500">{appointment.time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(appointment.status)}`}>
                        {getStatusLabel(appointment.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {appointment.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateStatus(appointment.id, 'confirmed')}
                            disabled={updating === appointment.id}
                            className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                          >
                            Konfirmasi
                          </button>
                          <button
                            onClick={() => updateStatus(appointment.id, 'cancelled')}
                            disabled={updating === appointment.id}
                            className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                          >
                            Batalkan
                          </button>
                        </div>
                      )}
                      {appointment.status === 'confirmed' && (
                        <button
                          onClick={() => updateStatus(appointment.id, 'completed')}
                          disabled={updating === appointment.id}
                          className="text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                        >
                          Selesaikan
                        </button>
                      )}
                      {(appointment.status === 'completed' || appointment.status === 'cancelled') && (
                        <span className="text-gray-400">Tidak ada aksi</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredAppointments.length)} dari {filteredAppointments.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sebelumnya
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 text-sm rounded ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-50'}`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notification Table - Beri Notifikasi pada Customer */}
      <div className="mt-8">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Beri Notifikasi pada Customer</h2>
          <p className="text-gray-500 mt-1">Kirim notifikasi browser kepada customer untuk mengingatkan giliran antrian</p>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-rose-500 to-rose-600 text-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Pelanggan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Layanan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Waktu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Notifikasi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedNotifAppointments.map((appointment, index) => (
                    <tr key={appointment.id} className="hover:bg-rose-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-rose-100 text-rose-600 font-bold">
                          {((notifCurrentPage - 1) * itemsPerPage) + index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {appointment.customerName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {appointment.customerEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {appointment.serviceName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{appointment.date}</div>
                        <div className="text-sm text-gray-500">{appointment.time}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {appointment.hasFcmToken ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            🔔 Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            🔕 Tidak Aktif
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => quickSendNotification(appointment)}
                            disabled={!appointment.hasFcmToken || sendingNotification === appointment.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 text-white text-xs font-medium rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            title={appointment.hasFcmToken ? 'Kirim notifikasi cepat' : 'Customer belum aktifkan notifikasi'}
                          >
                            {sendingNotification === appointment.id ? (
                              <>
                                ⏳ Mengirim...
                              </>
                            ) : (
                              <>
                                🔔 Kirim
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => openNotificationModal(appointment)}
                            disabled={!appointment.hasFcmToken}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            title="Custom message"
                          >
                            ✏️ Custom
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          
          {/* Notification Pagination */}
          {notifTotalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {((notifCurrentPage - 1) * itemsPerPage) + 1} - {Math.min(notifCurrentPage * itemsPerPage, notifAppointments.length)} of {notifAppointments.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setNotifCurrentPage(p => Math.max(1, p - 1))}
                  disabled={notifCurrentPage === 1}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sebelumnya
                </button>
                {Array.from({ length: notifTotalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setNotifCurrentPage(page)}
                    className={`px-3 py-1 text-sm rounded ${notifCurrentPage === page ? 'bg-rose-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-50'}`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setNotifCurrentPage(p => Math.min(notifTotalPages, p + 1))}
                  disabled={notifCurrentPage === notifTotalPages}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
          
          {notifAppointments.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">🔔</div>
              <p>Tidak ada antrian aktif saat ini</p>
            </div>
          )}
        </div>
      </div>

      {/* Notification Modal */}
      {notificationModal.isOpen && notificationModal.appointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-6 py-4 rounded-t-xl">
              <h3 className="text-lg font-semibold text-white">
                🔔 Kirim Notifikasi
              </h3>
              <p className="text-rose-100 text-sm mt-1">
                Ke: {notificationModal.appointment.customerName}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Judul Notifikasi
                </label>
                <input
                  type="text"
                  value={notificationModal.title}
                  onChange={(e) => setNotificationModal(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="Contoh: Giliran Anda Sudah Dekat!"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pesan
                </label>
                <textarea
                  value={notificationModal.body}
                  onChange={(e) => setNotificationModal(prev => ({ ...prev, body: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                  placeholder="Tulis pesan notifikasi..."
                />
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex gap-3 justify-end">
              <button
                onClick={() => setNotificationModal({ isOpen: false, appointment: null, title: '', body: '' })}
                className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Batal
              </button>
              <button
                onClick={sendNotification}
                disabled={!notificationModal.title || !notificationModal.body || sendingNotification !== null}
                className="px-4 py-2 text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {sendingNotification ? (
                  <>
                    ⏳ Mengirim...
                  </>
                ) : (
                  <>
                    🔔 Kirim Notifikasi
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
