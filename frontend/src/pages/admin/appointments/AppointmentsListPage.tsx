import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore'
import { adminFirestore } from '../../../config/firebaseAdmin'
import { useToast } from '../../../contexts/ToastContext'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { formatCurrency } from '../../../utils/format'

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
  serviceName?: string
  servicePrice?: number
  serviceDuration?: number
}

type FilterType = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'

export function AppointmentsListPage() {
  const { showToast } = useToast()
  
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')

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
          let userData = null
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
            serviceName: serviceData?.name || 'Unknown Service',
            servicePrice: serviceData?.price || 0,
            serviceDuration: serviceData?.durationMinutes || 0,
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
  }

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

  const getStatusIcon = (status: Appointment['status']) => {
    const icons = {
      pending: '⏳',
      confirmed: '✅',
      completed: '🎉',
      cancelled: '❌',
    }
    return icons[status]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Appointments</h1>
        <p className="text-gray-500 mt-1">Manage customer appointments</p>
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
              <p className="text-sm text-gray-500">Pending</p>
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
              <p className="text-sm text-gray-500">Confirmed</p>
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
              <p className="text-sm text-gray-500">Completed</p>
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
              placeholder="🔍 Search by customer or service..."
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
        Showing <span className="font-semibold text-gray-900">{filteredAppointments.length}</span> of {appointments.length} appointments
      </div>

      {/* Appointments Table */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No appointments found</h3>
          <p className="text-gray-600">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAppointments.map((appointment) => (
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
                          {formatCurrency(appointment.servicePrice || 0)} • {appointment.serviceDuration}min
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{appointment.date}</div>
                      <div className="text-sm text-gray-500">{appointment.time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(appointment.status)}`}>
                        <span>{getStatusIcon(appointment.status)}</span>
                        <span>{appointment.status}</span>
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
                            Confirm
                          </button>
                          <button
                            onClick={() => updateStatus(appointment.id, 'cancelled')}
                            disabled={updating === appointment.id}
                            className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      {appointment.status === 'confirmed' && (
                        <button
                          onClick={() => updateStatus(appointment.id, 'completed')}
                          disabled={updating === appointment.id}
                          className="text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                        >
                          Complete
                        </button>
                      )}
                      {(appointment.status === 'completed' || appointment.status === 'cancelled') && (
                        <span className="text-gray-400">No actions</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
