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
        icon: '/icons/icon-192.svg',
        badge: '/icons/icon-192.svg',
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

  // Play sound notification using Web Audio API (no external file needed)
  static playSound() {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gainNode.gain.value = 0.3
      
      oscillator.start()
      
      // Fade out
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.warn('Error playing sound:', error)
    }
  }
}
