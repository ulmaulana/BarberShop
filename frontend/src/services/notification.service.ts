// Notification Service untuk Browser Push Notifications
export class NotificationService {
  // Request permission untuk notifikasi
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Browser tidak support notifikasi')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }

    return false
  }

  // Check apakah permission sudah granted
  static hasPermission(): boolean {
    return 'Notification' in window && Notification.permission === 'granted'
  }

  // Kirim notifikasi browser
  static async sendBrowserNotification(title: string, options?: NotificationOptions) {
    if (!this.hasPermission()) {
      console.warn('Notifikasi tidak diizinkan')
      return null
    }

    try {
      const notification = new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        requireInteraction: true, // Notifikasi tidak hilang otomatis
        ...options
      })

      // Auto close setelah 10 detik jika user tidak interact
      setTimeout(() => notification.close(), 10000)

      return notification
    } catch (error) {
      console.error('Error sending notification:', error)
      return null
    }
  }

  // Notifikasi khusus untuk giliran antrian
  static async notifyQueueTurn(position: number, estimatedMinutes: number) {
    const title = position === 1 
      ? '🔔 Giliran Anda Sekarang!' 
      : `⏰ Giliran Anda Segera Tiba!`
    
    const body = position === 1
      ? 'Silakan menuju barber shop sekarang. Giliran Anda sudah tiba!'
      : `Anda antrian nomor ${position}. Estimasi ${estimatedMinutes} menit lagi.`

    return this.sendBrowserNotification(title, {
      body,
      tag: 'queue-notification', // Prevent duplicate notifications
      data: { position, estimatedMinutes },
    })
  }

  // Play sound notification
  static playSound() {
    try {
      const audio = new Audio('/notification-sound.mp3')
      audio.volume = 0.5
      audio.play().catch(err => console.warn('Cannot play sound:', err))
    } catch (error) {
      console.warn('Error playing sound:', error)
    }
  }
}
