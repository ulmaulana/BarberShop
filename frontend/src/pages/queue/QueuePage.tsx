import { useState, useEffect } from 'react'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { FirebaseService } from '../../services/firebase.service'
import { NotificationService } from '../../services/notification.service'
import { useQueueNotification } from '../../hooks/useQueueNotification'
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
  const [notificationEnabled, setNotificationEnabled] = useState(false)
  
  // Hook untuk monitor queue dan kirim notifikasi
  useQueueNotification({ myQueue, enabled: notificationEnabled })

  useEffect(() => {
    loadQueue()
    const interval = setInterval(loadQueue, 10000) // Refresh setiap 10 detik
    
    // Check notification permission saat mount
    setNotificationEnabled(NotificationService.hasPermission())
    
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

  const handleEnableNotifications = async () => {
    const granted = await NotificationService.requestPermission()
    
    if (granted) {
      setNotificationEnabled(true)
      showToast('Notifikasi diaktifkan! Anda akan menerima notifikasi saat giliran Anda tiba.', 'success')
    } else {
      showToast('Notifikasi ditolak. Silakan aktifkan di pengaturan browser.', 'warning')
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Antrian Walk-In</h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600">Bergabung dengan antrian untuk layanan tanpa appointment</p>
      </div>

      {/* Notification Banner */}
      {myQueue && !notificationEnabled && (
        <Card className="border-2 border-yellow-400 bg-yellow-50">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔔</span>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">Aktifkan Notifikasi</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Dapatkan notifikasi browser dan email saat giliran Anda tiba!
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleEnableNotifications}
                className="w-full sm:w-auto text-sm bg-yellow-500 hover:bg-yellow-600"
              >
                Aktifkan Notifikasi
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Status - Jika sudah enabled */}
      {myQueue && notificationEnabled && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <p className="text-xs sm:text-sm text-green-800 font-medium">
            Notifikasi aktif - Anda akan mendapat pemberitahuan saat giliran tiba
          </p>
        </div>
      )}

      {myQueue ? (
        <Card className="border-2 border-blue-500">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Status Antrian Anda</h3>
                <div className="mt-3 space-y-2">
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600">#{myQueue.position}</p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Estimasi tunggu: <span className="font-medium">{myQueue.estimatedWaitMinutes} menit</span>
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Bergabung: {formatTime(myQueue.joinedAt)}
                  </p>
                </div>
              </div>
              <Button variant="danger" onClick={handleLeaveQueue} className="w-full sm:w-auto text-sm">
                Keluar dari Antrian
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Bergabung dengan Antrian</h3>
                <p className="mt-2 text-xs sm:text-sm text-gray-600">
                  Saat ini ada <span className="font-medium">{queue.length} orang</span> dalam antrian.
                  {queue.length > 0 && (
                    <span> Estimasi waktu tunggu: <span className="font-medium">{queue.length * 20} menit</span></span>
                  )}
                </p>
              </div>
              <Button onClick={handleJoinQueue} isLoading={joining} className="w-full sm:w-auto text-sm">
                Gabung Antrian
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-4 text-lg sm:text-xl font-semibold text-gray-900">Antrian Saat Ini</h2>
        {queue.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm sm:text-base text-gray-600">
              Tidak ada antrian saat ini.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {queue.map((entry) => (
              <Card key={entry.id} className={entry.id === myQueue?.id ? 'border-2 border-blue-500' : ''}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">#{entry.position}</p>
                      <p className="text-[10px] sm:text-xs text-gray-600">{formatTime(entry.joinedAt)}</p>
                    </div>
                    {entry.id === myQueue?.id && (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] sm:text-xs font-medium text-blue-800">
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
