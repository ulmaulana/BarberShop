import { useEffect, useRef } from 'react'
import { NotificationService } from '../services/notification.service'
import type { QueueEntry } from '../types'

interface UseQueueNotificationProps {
  myQueue: QueueEntry | null
  enabled?: boolean
}

export function useQueueNotification({ myQueue, enabled = true }: UseQueueNotificationProps) {
  const previousPositionRef = useRef<number | null>(null)
  const hasNotifiedRef = useRef<boolean>(false)

  useEffect(() => {
    if (!enabled || !myQueue) {
      return
    }

    const currentPosition = myQueue.position
    const previousPosition = previousPositionRef.current

    // Simpan posisi saat ini untuk comparison berikutnya
    previousPositionRef.current = currentPosition

    // Skip jika ini first load
    if (previousPosition === null) {
      return
    }

    // Detect jika posisi berubah (naik dalam antrian)
    const positionChanged = previousPosition !== currentPosition && currentPosition < previousPosition

    // Trigger notification jika:
    // 1. Posisi = 1 (giliran sekarang)
    // 2. Posisi = 2 (next in line)
    // 3. Posisi berubah dan <= 3
    const shouldNotify = 
      (currentPosition === 1 && !hasNotifiedRef.current) ||
      (currentPosition === 2 && positionChanged) ||
      (currentPosition <= 3 && positionChanged)

    if (shouldNotify) {
      sendQueueNotification(currentPosition, myQueue.estimatedWaitMinutes)
      
      // Mark as notified jika sudah posisi 1
      if (currentPosition === 1) {
        hasNotifiedRef.current = true
      }
    }

  }, [myQueue, enabled])

  // Reset notification state ketika keluar dari antrian
  useEffect(() => {
    if (!myQueue) {
      previousPositionRef.current = null
      hasNotifiedRef.current = false
    }
  }, [myQueue])

  const sendQueueNotification = async (position: number, estimatedMinutes: number) => {
    // Request permission jika belum
    if (!NotificationService.hasPermission()) {
      const granted = await NotificationService.requestPermission()
      if (!granted) return
    }

    // Kirim browser notification
    await NotificationService.notifyQueueTurn(position, estimatedMinutes)
    
    // Play sound
    NotificationService.playSound()

    // TODO: Kirim email notification via API
    await sendEmailNotification(position, estimatedMinutes)
  }

  const sendEmailNotification = async (position: number, estimatedMinutes: number) => {
    try {
      // TODO: Implement Firebase Cloud Function untuk kirim email
      // Untuk sekarang, hanya log console
      console.log(`Would send email notification: Position ${position}, Est ${estimatedMinutes} min`)
      
      // Uncomment ini setelah deploy Firebase Function:
      // const functions = getFunctions()
      // const sendEmail = httpsCallable(functions, 'sendQueueNotificationEmail')
      // await sendEmail({ position, estimatedMinutes })
    } catch (error) {
      console.error('Error sending email notification:', error)
    }
  }
}
