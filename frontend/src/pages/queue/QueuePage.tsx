import { useState, useEffect } from 'react'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { FirebaseService } from '../../services/firebase.service'
import { formatTime } from '../../utils/date'
import { handleError } from '../../utils/error'
import type { QueueEntry } from '../../types'

const queueService = new FirebaseService('queue')

export function QueuePage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [myQueue, setMyQueue] = useState<QueueEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    loadQueue()
    const interval = setInterval(loadQueue, 10000) // Refresh setiap 10 detik
    return () => clearInterval(interval)
  }, [])

  const loadQueue = async () => {
    try {
      const waitingConstraint = FirebaseService.where('status', '==', 'waiting')
      const data = await queueService.query([waitingConstraint, FirebaseService.orderBy('position', 'asc')])
      setQueue(data as QueueEntry[])
      
      if (user) {
        const myEntry = data.find((q: any) => q.customerId === user.uid && q.status === 'waiting')
        setMyQueue(myEntry as QueueEntry || null)
      }
    } catch (error) {
      showToast(handleError(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinQueue = async () => {
    if (!user) return
    
    setJoining(true)
    try {
      const newPosition = queue.length + 1
      await queueService.create({
        customerId: user.uid,
        position: newPosition,
        status: 'waiting',
        estimatedWaitMinutes: newPosition * 20,
        joinedAt: new Date().toISOString(),
      })
      
      showToast('Berhasil bergabung dengan antrian!', 'success')
      await loadQueue()
    } catch (error) {
      showToast(handleError(error), 'error')
    } finally {
      setJoining(false)
    }
  }

  const handleLeaveQueue = async () => {
    if (!myQueue) return
    
    try {
      await queueService.update(myQueue.id, { status: 'left' })
      showToast('Anda telah keluar dari antrian', 'info')
      await loadQueue()
    } catch (error) {
      showToast(handleError(error), 'error')
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Antrian Walk-In</h1>
        <p className="mt-2 text-gray-600">Bergabung dengan antrian untuk layanan tanpa appointment</p>
      </div>

      {myQueue ? (
        <Card className="border-2 border-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Status Antrian Anda</h3>
                <div className="mt-3 space-y-2">
                  <p className="text-3xl font-bold text-blue-600">#{myQueue.position}</p>
                  <p className="text-sm text-gray-600">
                    Estimasi tunggu: <span className="font-medium">{myQueue.estimatedWaitMinutes} menit</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Bergabung: {formatTime(myQueue.joinedAt)}
                  </p>
                </div>
              </div>
              <Button variant="danger" onClick={handleLeaveQueue}>
                Keluar dari Antrian
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Bergabung dengan Antrian</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Saat ini ada <span className="font-medium">{queue.length} orang</span> dalam antrian.
                  {queue.length > 0 && (
                    <span> Estimasi waktu tunggu: <span className="font-medium">{queue.length * 20} menit</span></span>
                  )}
                </p>
              </div>
              <Button onClick={handleJoinQueue} isLoading={joining}>
                Gabung Antrian
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Antrian Saat Ini</h2>
        {queue.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-600">
              Tidak ada antrian saat ini.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {queue.map((entry) => (
              <Card key={entry.id} className={entry.id === myQueue?.id ? 'border-2 border-blue-500' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">#{entry.position}</p>
                      <p className="text-xs text-gray-600">{formatTime(entry.joinedAt)}</p>
                    </div>
                    {entry.id === myQueue?.id && (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                        Anda
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
