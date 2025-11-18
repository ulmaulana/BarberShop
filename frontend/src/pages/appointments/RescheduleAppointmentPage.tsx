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
  // Populated data
  serviceName?: string
  servicePrice?: number
  serviceDuration?: number
}

export function RescheduleAppointmentPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [notes, setNotes] = useState('')

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
        showToast('Appointment not found', 'error')
        navigate('/appointments')
        return
      }

      const data = appointmentDoc.data()
      
      // Check if user owns this appointment
      if (data.userId !== user?.uid) {
        showToast('Unauthorized access', 'error')
        navigate('/appointments')
        return
      }

      // Check if appointment can be rescheduled
      if (data.status === 'completed' || data.status === 'cancelled') {
        showToast('Cannot reschedule completed or cancelled appointments', 'error')
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

      const appointmentData = {
        id: appointmentDoc.id,
        ...data,
        serviceName: serviceData?.name,
        servicePrice: serviceData?.price,
        serviceDuration: serviceData?.durationMinutes,
      } as Appointment

      setAppointment(appointmentData)
      
      // Set current values
      setSelectedDate(new Date(data.date))
      setSelectedTime(data.time)
      setNotes(data.notes || '')
    } catch (error) {
      console.error('Error loading appointment:', error)
      showToast('Failed to load appointment', 'error')
      navigate('/appointments')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!appointmentId || !selectedDate || !selectedTime) {
      showToast('Please select date and time', 'error')
      return
    }

    setSubmitting(true)
    try {
      await updateDoc(doc(firestore, 'appointments', appointmentId), {
        date: selectedDate.toISOString().split('T')[0],
        time: selectedTime,
        notes: notes || '',
        status: 'pending', // Reset to pending after reschedule
        updatedAt: new Date().toISOString()
      })
      
      showToast('Appointment rescheduled successfully!', 'success')
      navigate(`/appointments/${appointmentId}`)
    } catch (error) {
      console.error('Error rescheduling appointment:', error)
      showToast('Failed to reschedule appointment', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const timeSlots = {
    morning: ['09:00', '09:45', '10:30', '11:15'],
    afternoon: ['13:00', '13:45', '14:30', '15:15', '16:00'],
    evening: ['17:00', '17:45', '18:30', '19:15']
  }

  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()

    const days: (number | null)[] = []
    
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    
    return days
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  const changeMonth = (delta: number) => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(newDate.getMonth() + delta)
    setSelectedDate(newDate)
  }

  const selectDay = (day: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(day)
    setSelectedDate(newDate)
  }

  const isToday = (day: number) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    )
  }

  const isSelected = (day: number) => {
    return day === selectedDate.getDate()
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
            to={`/appointments/${appointmentId}`}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            ← Back to Details
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Reschedule Appointment</h1>
          <p className="text-gray-600 mt-1">Choose a new date and time for your appointment</p>
        </div>

        {/* Current Appointment Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Current Appointment</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700">Service:</span>
              <span className="ml-2 font-medium text-blue-900">{appointment.serviceName}</span>
            </div>
            <div>
              <span className="text-blue-700">Date:</span>
              <span className="ml-2 font-medium text-blue-900">{appointment.date}</span>
            </div>
            <div>
              <span className="text-blue-700">Time:</span>
              <span className="ml-2 font-medium text-blue-900">{appointment.time}</span>
            </div>
            <div>
              <span className="text-blue-700">Price:</span>
              <span className="ml-2 font-medium text-blue-900">{formatCurrency(appointment.servicePrice || 0)}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            {/* Calendar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select New Date
              </label>
              
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  ←
                </button>
                <h3 className="text-lg font-semibold text-gray-900">
                  {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                </h3>
                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  →
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                    {day}
                  </div>
                ))}
                {generateCalendarDays().map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => day && selectDay(day)}
                    disabled={!day}
                    className={`
                      aspect-square p-2 rounded-lg text-sm font-medium transition
                      ${!day ? 'invisible' : ''}
                      ${isSelected(day!) ? 'bg-blue-600 text-white' : ''}
                      ${isToday(day!) && !isSelected(day!) ? 'bg-blue-100 text-blue-900' : ''}
                      ${!isSelected(day!) && !isToday(day!) ? 'hover:bg-gray-100 text-gray-900' : ''}
                    `}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slots */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select New Time
              </label>
              
              {Object.entries(timeSlots).map(([period, slots]) => (
                <div key={period} className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-2 capitalize">{period}</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map(time => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium transition
                          ${selectedTime === time
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                          }
                        `}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any special requests or notes..."
              />
            </div>

            {/* Summary */}
            {selectedDate && selectedTime && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">New Appointment Summary</h4>
                <div className="space-y-1 text-sm text-gray-700">
                  <p><span className="font-medium">Date:</span> {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p><span className="font-medium">Time:</span> {selectedTime}</p>
                  <p><span className="font-medium">Service:</span> {appointment.serviceName}</p>
                  <p><span className="font-medium">Duration:</span> {appointment.serviceDuration} minutes</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Link
                to={`/appointments/${appointmentId}`}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={!selectedTime || submitting}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Rescheduling...' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
