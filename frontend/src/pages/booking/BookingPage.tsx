import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { collection, addDoc, getDocs } from 'firebase/firestore'
import { firestore } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
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
      showToast('Silakan login untuk membuat appointment', 'error')
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
        showToast('Tidak ada layanan tersedia', 'info')
      }
    } catch (error) {
      console.error('Error loading services:', error)
      showToast('Gagal memuat layanan', 'error')
    } finally {
      setLoading(false)
    }
  }

  const selectedService = services.find(s => s.id === selectedServiceId)

  const handleNext = () => {
    if (currentStep === 1 && !selectedServiceId) {
      showToast('Silakan pilih layanan', 'error')
      return
    }
    if (currentStep === 2 && (!selectedDate || !selectedTime)) {
      showToast('Silakan pilih tanggal dan waktu', 'error')
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
      showToast('Appointment berhasil dibuat!', 'success')
      navigate('/appointments')
    } catch (error) {
      showToast('Gagal membuat appointment', 'error')
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
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Progress */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl sm:text-5xl font-light text-slate-900 tracking-tight">Book Appointment</h1>
            <div className="text-sm text-slate-600">
              <span className="font-medium">Step {currentStep} of 3</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="flex gap-3">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  step <= currentStep ? 'bg-slate-900' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 md:p-10">
          {/* Step 1: Select Service */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-light text-slate-900 mb-8">Select Service</h2>
              
              {services.length === 0 ? (
                <div className="text-center py-16">
                  <h3 className="text-xl font-medium text-slate-900 mb-2">No Services Available</h3>
                  <p className="text-slate-600 mb-8">There are no services to book at the moment.</p>
                  <button
                    onClick={() => navigate('/services')}
                    className="px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 font-medium transition-all"
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
                    className={`text-left p-5 rounded-2xl border transition-all ${
                      selectedServiceId === service.id
                        ? 'border-slate-900 bg-white shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-slate-100 rounded-xl flex-shrink-0 overflow-hidden">
                        {service.imageUrl ? (
                          <img
                            src={service.imageUrl}
                            alt={service.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://via.placeholder.com/100x100?text=No+Image'
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-100"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-900 mb-1">{service.name}</h3>
                        <p className="text-xs text-slate-500 mb-3 uppercase tracking-wide">{service.category}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-light text-slate-900">
                            {formatCurrency(service.price)}
                          </span>
                          <span className="text-slate-500">
                            {service.durationMinutes} min
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
              <h2 className="text-2xl font-light text-slate-900 mb-8">Select Date & Time</h2>
              
              {/* Selected Service Info */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-8 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Selected Service</p>
                  <p className="font-medium text-slate-900">
                    {selectedService.name} ({formatCurrency(selectedService.price)}, {selectedService.durationMinutes} min)
                  </p>
                </div>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-slate-900 hover:text-slate-700 text-sm font-medium"
                >
                  Change
                </button>
              </div>

              {/* Calendar */}
              <div className="mb-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-medium text-slate-900">Choose Date</h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const newDate = new Date(selectedDate)
                        newDate.setMonth(newDate.getMonth() - 1)
                        setSelectedDate(newDate)
                      }}
                      className="px-4 py-2 text-sm border border-slate-300 rounded-xl hover:bg-white bg-white text-slate-700"
                    >
                      ← Prev
                    </button>
                    <span className="font-medium text-slate-900 min-w-[140px] text-center">
                      {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                    </span>
                    <button
                      onClick={() => {
                        const newDate = new Date(selectedDate)
                        newDate.setMonth(newDate.getMonth() + 1)
                        setSelectedDate(newDate)
                      }}
                      className="px-4 py-2 text-sm border border-slate-300 rounded-xl hover:bg-white bg-white text-slate-700"
                    >
                      Next →
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="grid grid-cols-7 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="text-center text-xs font-medium text-slate-500 py-2 uppercase tracking-wide">
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
                          className={`p-2 text-center rounded-xl transition-all text-sm ${
                            isSelected
                              ? 'bg-slate-900 text-white font-medium'
                              : isToday
                              ? 'bg-slate-100 text-slate-900 font-medium'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <h3 className="font-medium text-slate-900 mb-6">
                  Available Time Slots for {selectedDate.toLocaleDateString()}
                </h3>

                <div className="space-y-6">
                  {/* Morning */}
                  <div>
                    <h4 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">Morning</h4>
                    <div className="flex flex-wrap gap-2">
                      {timeSlots.morning.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`px-5 py-2.5 rounded-xl border transition-all ${
                            selectedTime === time
                              ? 'border-slate-900 bg-slate-900 text-white font-medium'
                              : 'border-slate-300 hover:border-slate-400 hover:bg-white bg-white text-slate-700'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Afternoon */}
                  <div>
                    <h4 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">Afternoon</h4>
                    <div className="flex flex-wrap gap-2">
                      {timeSlots.afternoon.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`px-5 py-2.5 rounded-xl border transition-all ${
                            selectedTime === time
                              ? 'border-slate-900 bg-slate-900 text-white font-medium'
                              : 'border-slate-300 hover:border-slate-400 hover:bg-white bg-white text-slate-700'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Evening */}
                  <div>
                    <h4 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">Evening</h4>
                    <div className="flex flex-wrap gap-2">
                      {timeSlots.evening.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`px-5 py-2.5 rounded-xl border transition-all ${
                            selectedTime === time
                              ? 'border-slate-900 bg-slate-900 text-white font-medium'
                              : 'border-slate-300 hover:border-slate-400 hover:bg-white bg-white text-slate-700'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-white border border-slate-200 rounded-2xl">
                  <p className="text-sm text-slate-600">
                    Barber akan dipilihkan otomatis berdasarkan ketersediaan
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Confirm & Notes */}
          {currentStep === 3 && selectedService && (
            <div>
              <h2 className="text-2xl font-light text-slate-900 mb-8">Confirm & Add Notes</h2>
              
              {/* Booking Summary */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
                <h3 className="font-medium text-slate-900 mb-6">Booking Summary</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Service</span>
                    <span className="font-medium text-slate-900">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Date</span>
                    <span className="font-medium text-slate-900">{selectedDate.toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Time</span>
                    <span className="font-medium text-slate-900">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Duration</span>
                    <span className="font-medium text-slate-900">{selectedService.durationMinutes} minutes</span>
                  </div>
                  <hr className="border-slate-200" />
                  <div className="flex justify-between text-lg">
                    <span className="font-medium text-slate-900">Price</span>
                    <span className="font-light text-slate-900">{formatCurrency(selectedService.price)}</span>
                  </div>
                </div>
              </div>

              {/* Special Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Special Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Saya ingin model fade..."
                  rows={4}
                  className="w-full px-5 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-10 pt-8 border-t border-slate-200">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-2xl font-medium transition-all ${
                currentStep === 1
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              ← Back
            </button>

            <button
              onClick={handleNext}
              disabled={submitting}
              className="px-8 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 font-medium transition-all disabled:opacity-50"
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
