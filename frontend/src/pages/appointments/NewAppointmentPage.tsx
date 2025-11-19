import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { FirebaseService } from '../../services/firebase.service'
import { handleError } from '../../utils/error'
import { addMinutesToDate } from '../../utils/date'
import type { Service, Barber } from '../../types'

const servicesService = new FirebaseService('services')
const barbersService = new FirebaseService('barbers')
const appointmentsService = new FirebaseService('appointments')

export function NewAppointmentPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  
  const [services, setServices] = useState<Service[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    serviceId: searchParams.get('serviceId') || '',
    barberId: '',
    startTime: '',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [servicesData, barbersData] = await Promise.all([
        servicesService.getAll(),
        barbersService.getAll(),
      ])
      setServices(servicesData as Service[])
      setBarbers(barbersData as Barber[])
    } catch (error) {
      showToast(handleError(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.serviceId) newErrors.serviceId = 'Pilih layanan'
    if (!formData.barberId) newErrors.barberId = 'Pilih barber'
    if (!formData.startTime) newErrors.startTime = 'Pilih tanggal dan waktu'
    
    // Check if date is in the past
    if (formData.startTime && new Date(formData.startTime) < new Date()) {
      newErrors.startTime = 'Tanggal tidak boleh di masa lalu'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate() || !user) return
    
    const selectedService = services.find(s => s.id === formData.serviceId)
    if (!selectedService) return
    
    setSubmitting(true)
    try {
      const startTime = new Date(formData.startTime).toISOString()
      const endTime = addMinutesToDate(startTime, selectedService.durationMinutes)
      
      await appointmentsService.create({
        customerId: user.uid,
        barberId: formData.barberId,
        serviceId: formData.serviceId,
        startTime,
        endTime,
        status: 'pending',
        notes: formData.notes || '',
      })
      
      showToast('Appointment berhasil dibuat!', 'success')
      navigate('/appointments')
    } catch (error) {
      showToast(handleError(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />
  }

  const selectedService = services.find(s => s.id === formData.serviceId)
  const availableBarbers = formData.serviceId
    ? barbers.filter(b => selectedService?.barberIds.includes(b.id))
    : []

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Buat Appointment Baru</h1>
        <p className="mt-2 text-gray-600">Isi form di bawah untuk membuat appointment</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Pilih Layanan <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.serviceId}
              onChange={(e) => setFormData({ ...formData, serviceId: e.target.value, barberId: '' })}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Pilih Layanan --</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - {service.durationMinutes} menit
                </option>
              ))}
            </select>
            {errors.serviceId && <p className="mt-1 text-sm text-red-600">{errors.serviceId}</p>}
          </div>

          {formData.serviceId && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Pilih Barber <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.barberId}
                onChange={(e) => setFormData({ ...formData, barberId: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Pilih Barber --</option>
                {availableBarbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.name} (Rating: {barber.rating.toFixed(1)})
                  </option>
                ))}
              </select>
              {errors.barberId && <p className="mt-1 text-sm text-red-600">{errors.barberId}</p>}
            </div>
          )}

          <Input
            label="Tanggal & Waktu"
            type="datetime-local"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            error={errors.startTime}
            required
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Catatan (Opsional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tambahkan catatan khusus..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              Batal
            </Button>
            <Button type="submit" isLoading={submitting} className="flex-1">
              Buat Appointment
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
