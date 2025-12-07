import { useState } from 'react'
import { useNotificationPermission } from '../hooks/useNotificationPermission'

export function NotificationPermissionPrompt() {
  const {
    isSupported,
    shouldShowPrompt,
    isLoading,
    requestPermission,
    dismissPrompt
  } = useNotificationPermission()

  const [isVisible, setIsVisible] = useState(true)

  // Jangan tampilkan jika tidak didukung atau tidak perlu
  if (!isSupported || !shouldShowPrompt || !isVisible) {
    return null
  }

  const handleAllow = async () => {
    await requestPermission()
    setIsVisible(false)
  }

  const handleDismiss = () => {
    dismissPrompt()
    setIsVisible(false)
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <span className="text-xl">&#128276;</span>
            <span className="font-semibold">Aktifkan Notifikasi</span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition text-xl"
            aria-label="Tutup"
          >
            &#10005;
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-600 text-sm mb-4">
            Dapatkan notifikasi saat giliran antrian Anda sudah dekat! Jangan sampai ketinggalan jadwal potong rambut Anda.
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleDismiss}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
            >
              Nanti Saja
            </button>
            <button
              onClick={handleAllow}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <span>&#128276;</span>
                  Izinkan
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
