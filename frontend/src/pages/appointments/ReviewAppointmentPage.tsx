import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { FirebaseService } from '../../services/firebase.service'
import { handleError } from '../../utils/error'
import type { Appointment } from '../../types'

const appointmentsService = new FirebaseService('appointments')
const reviewsService = new FirebaseService('reviews')

export function ReviewAppointmentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (id) {
      loadAppointment()
    }
  }, [id])

  const loadAppointment = async () => {
    if (!id) return
    
    try {
      const data = await appointmentsService.getById(id) as Appointment
      setAppointment(data)
    } catch (error) {
      showToast(handleError(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!appointment || !user) return
    
    setSubmitting(true)
    try {
      // Review untuk toko secara keseluruhan, tidak perlu barberId
      await reviewsService.create({
        appointmentId: appointment.id,
        customerId: user.uid,
        serviceId: appointment.serviceId || null,
        rating,
        comment: comment.trim() || null,
        createdAt: new Date().toISOString(),
      })
      
      showToast('Review berhasil dikirim!', 'success')
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

  if (!appointment || appointment.status !== 'completed') {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">Appointment tidak ditemukan atau belum selesai.</p>
        <Button onClick={() => navigate('/appointments')} className="mt-4">
          Kembali
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Beri Review</h1>
        <p className="mt-2 text-gray-600">Bagikan pengalaman Anda dengan layanan kami</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-3 block text-sm font-medium text-gray-700">
              Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="text-4xl transition-transform hover:scale-110"
                >
                  {star <= rating ? '⭐' : '☆'}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {rating === 5 && 'Sangat Puas'}
              {rating === 4 && 'Puas'}
              {rating === 3 && 'Cukup'}
              {rating === 2 && 'Kurang Puas'}
              {rating === 1 && 'Tidak Puas'}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Komentar (Opsional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ceritakan pengalaman Anda..."
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/appointments')}
            >
              Batal
            </Button>
            <Button type="submit" isLoading={submitting} className="flex-1">
              Kirim Review
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
