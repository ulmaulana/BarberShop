import type { ReactNode } from 'react'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string | ReactNode
  confirmText?: string
  cancelText?: string
  type?: 'success' | 'danger' | 'warning'
  icon?: string
  loading?: boolean
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  type = 'warning',
  icon,
  loading = false
}: ConfirmationModalProps) {
  if (!isOpen) return null

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          button: 'bg-green-600 hover:bg-green-700'
        }
      case 'danger':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          button: 'bg-red-600 hover:bg-red-700'
        }
      default:
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          button: 'bg-yellow-600 hover:bg-yellow-700'
        }
    }
  }

  const colors = getColors()
  const defaultIcon = type === 'success' ? '✅' : type === 'danger' ? '❌' : '⚠️'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-scale-in">
        {/* Icon & Title */}
        <div className={`${colors.bg} border-b ${colors.border} px-6 py-4`}>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{icon || defaultIcon}</span>
            <h3 className={`text-xl font-bold ${colors.text}`}>
              {title}
            </h3>
          </div>
        </div>

        {/* Message */}
        <div className="px-6 py-6">
          <div className="text-gray-700 whitespace-pre-line">
            {message}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-6 py-2.5 ${colors.button} text-white rounded-lg transition font-medium disabled:opacity-50 min-w-[120px]`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Memproses...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
