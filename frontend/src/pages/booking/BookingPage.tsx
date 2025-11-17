import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { collection, addDoc, getDocs } from 'firebase/firestore'
import { firestore } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { CloudinaryService } from '../../services/cloudinary.service'
import { formatCurrency } from '../../utils/format'

interface Service {
  id: string
  name: string
  price: number
  durationMinutes: number
  category: string
  description?: string
  imageUrl?: string
  isActive?: boolean
}

type Step = 1 | 2 | 3

export function BookingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { showToast } = useToast()

  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  // Form data
  const [selectedServiceId, setSelectedServiceId] = useState<string>(searchParams.get('serviceId') || '')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) {
      showToast('Please login to book an appointment', 'error')
      navigate('/login?redirect=/booking')
      return
    }
    loadServices()
  }, [user])

  const loadServices = async () => {
    try {
      const servicesRef = collection(firestore, 'services')
      const snapshot = await getDocs(servicesRef)
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Service[]
      
      // Filter active services if isActive field exists, otherwise show all
      const activeServices = data.filter(s => s.isActive !== false)
      setServices(activeServices)
      
      if (activeServices.length === 0) {
        showToast('No services available', 'info')
      }
    } catch (error) {
      console.error('Error loading services:', error)
      showToast('Failed to load services', 'error')
    } finally {
      setLoading(false)
    }
  }

  const selectedService = services.find(s => s.id === selectedServiceId)

  const handleNext = () => {
    if (currentStep === 1 && !selectedServiceId) {
      showToast('Please select a service', 'error')
      return
    }
    if (currentStep === 2 && (!selectedDate || !selectedTime)) {
      showToast('Please select date and time', 'error')
      return
    }
    if (currentStep < 3) {
      setCurrentStep((currentStep + 1) as Step)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step)
    }
  }

  const handleSubmit = async () => {
    if (!user || !selectedServiceId || !selectedDate || !selectedTime) return

    setSubmitting(true)
    try {
      const appointmentData = {
        userId: user.uid,
        serviceId: selectedServiceId,
        date: selectedDate.toISOString().split('T')[0],
        time: selectedTime,
        notes: notes || '',
        status: 'pending',
        createdAt: new Date().toISOString()
      }

      await addDoc(collection(firestore, 'appointments'), appointmentData)
      showToast('Appointment booked successfully!', 'success')
      navigate('/appointments')
    } catch (error) {
      showToast('Failed to book appointment', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const timeSlots = {
    morning: ['09:00', '09:45', '10:30', '11:15'],
    afternoon: ['13:00', '13:45', '14:30', '15:15', '16:00'],
    evening: ['17:00', '17:45', '18:30', '19:15']
  }

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()

    const days: (number | null)[] = []
    
    // Add empty slots for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    
    return days
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Book an Appointment</h1>
            <div className="text-sm text-gray-600">
              Progress: <span className="font-semibold">Step {currentStep}/3</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="flex gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          {/* Step 1: Select Service */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 1: Select Service</h2>
              
              {services.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">✂️</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Services Available</h3>
                  <p className="text-gray-600 mb-6">There are no services to book at the moment.</p>
                  <button
                    onClick={() => navigate('/services')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
                  >
                    View Services
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedServiceId(service.id)}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      selectedServiceId === service.id
                        ? 'border-blue-600 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                        {service.imageUrl ? (
                          <img
                            src={CloudinaryService.getOptimizedUrl(service.imageUrl as any, { width: 100, height: 100 })}
                            alt={service.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">
                            ✂️
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{service.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{service.category}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-semibold text-blue-600">
                            {formatCurrency(service.price)}
                          </span>
                          <span className="text-gray-600">
                            ⏱️ {service.durationMinutes} min
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              )}
            </div>
          )}

          {/* Step 2: Select Date & Time */}
          {currentStep === 2 && selectedService && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 2: Select Date & Time</h2>
              
              {/* Selected Service Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Selected Service:</p>
                  <p className="font-semibold text-gray-900">
                    {selectedService.name} ({formatCurrency(selectedService.price)}, {selectedService.durationMinutes} min)
                  </p>
                </div>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Change
                </button>
              </div>

              <hr className="my-6" />

              {/* Calendar */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Choose Date:</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newDate = new Date(selectedDate)
                        newDate.setMonth(newDate.getMonth() - 1)
                        setSelectedDate(newDate)
                      }}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                      ← Prev
                    </button>
                    <span className="font-medium">
                      {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                    </span>
                    <button
                      onClick={() => {
                        const newDate = new Date(selectedDate)
                        newDate.setMonth(newDate.getMonth() + 1)
                        setSelectedDate(newDate)
                      }}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Next →
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                      {day}
                    </div>
                  ))}
                  {generateCalendarDays().map((day, index) => {
                    if (day === null) {
                      return <div key={`empty-${index}`} />
                    }
                    const isToday = day === new Date().getDate() && 
                                    selectedDate.getMonth() === new Date().getMonth() &&
                                    selectedDate.getFullYear() === new Date().getFullYear()
                    const isSelected = day === selectedDate.getDate()
                    
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          const newDate = new Date(selectedDate)
                          newDate.setDate(day)
                          setSelectedDate(newDate)
                        }}
                        className={`p-2 text-center rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white font-semibold'
                            : isToday
                            ? 'bg-blue-100 text-blue-600 font-medium'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">
                  Available Time Slots for {selectedDate.toLocaleDateString()}:
                </h3>

                <div className="space-y-4">
                  {/* Morning */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Morning</h4>
                    <div className="flex flex-wrap gap-2">
                      {timeSlots.morning.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`px-4 py-2 rounded-lg border transition-all ${
                            selectedTime === time
                              ? 'border-blue-600 bg-blue-600 text-white font-semibold'
                              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                          }`}
                        >
                          ○ {time}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Afternoon */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Afternoon</h4>
                    <div className="flex flex-wrap gap-2">
                      {timeSlots.afternoon.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`px-4 py-2 rounded-lg border transition-all ${
                            selectedTime === time
                              ? 'border-blue-600 bg-blue-600 text-white font-semibold'
                              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                          }`}
                        >
                          ○ {time}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Evening */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Evening</h4>
                    <div className="flex flex-wrap gap-2">
                      {timeSlots.evening.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`px-4 py-2 rounded-lg border transition-all ${
                            selectedTime === time
                              ? 'border-blue-600 bg-blue-600 text-white font-semibold'
                              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                          }`}
                        >
                          ○ {time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    ℹ️ Barber akan dipilihkan otomatis berdasarkan ketersediaan
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Confirm & Notes */}
          {currentStep === 3 && selectedService && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 3: Confirm & Add Notes</h2>
              
              {/* Booking Summary */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Booking Summary</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service:</span>
                    <span className="font-medium">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{selectedDate.toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{selectedService.durationMinutes} minutes</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold text-gray-900">Price:</span>
                    <span className="font-bold text-blue-600">{formatCurrency(selectedService.price)}</span>
                  </div>
                </div>
              </div>

              {/* Special Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Notes (Optional):
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Saya ingin model fade..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-lg font-medium transition ${
                currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ← Back
            </button>

            <button
              onClick={handleNext}
              disabled={submitting}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {submitting ? (
                'Submitting...'
              ) : currentStep === 3 ? (
                'Confirm Booking →'
              ) : (
                'Continue →'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
