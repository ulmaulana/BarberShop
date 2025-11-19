import { useState, useEffect } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { adminFirestore } from '../../../config/firebaseAdmin'
import { useToast } from '../../../contexts/ToastContext'
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal'

interface Order {
  id: string
  orderNumber: string
  customerId: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  items: any[]
  totalAmount: number
  paymentMethod: 'transfer' | 'cash'
  paymentProofUrl?: string
  status: string
  createdAt: any
}

interface Props {
  order: Order
  onClose: () => void
}

export function PaymentVerificationModal({ order, onClose }: Props) {
  const [zoom, setZoom] = useState(100)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [showApproveConfirm, setShowApproveConfirm] = useState(false)
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const { showToast } = useToast()
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (loading) return
      
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        handleApprove()
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        handleReject()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [loading, notes])
  
  // Show approve confirmation modal
  const handleApprove = () => {
    setShowApproveConfirm(true)
  }

  // Actual approve action after confirmation
  const confirmApprove = async () => {
    const paymentMethod = order.paymentMethod === 'transfer' ? 'Transfer/QRIS' : 'Cash on Pickup'
    
    try {
      setLoading(true)
      setShowApproveConfirm(false)
      
      await updateDoc(doc(adminFirestore, 'orders', order.id), {
        status: 'paid',
        paymentVerifiedAt: serverTimestamp(),
        paymentVerifiedBy: 'admin', // TODO: Get actual admin user ID
        verificationNotes: notes.trim() || `Pembayaran ${paymentMethod} berhasil dikonfirmasi`,
        updatedAt: serverTimestamp(),
      })
      
      showToast(`✅ Pembayaran berhasil dikonfirmasi! (${paymentMethod})`, 'success')
      onClose()
    } catch (error) {
      console.error('Failed to approve payment:', error)
      showToast('Gagal mengkonfirmasi pembayaran', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  // Show reject confirmation modal
  const handleReject = () => {
    setShowRejectConfirm(true)
  }

  // Actual reject action after confirmation
  const confirmReject = async () => {
    try {
      setLoading(true)
      setShowRejectConfirm(false)
      
      await updateDoc(doc(adminFirestore, 'orders', order.id), {
        status: 'payment_rejected',
        paymentRejectedAt: serverTimestamp(),
        paymentRejectedBy: 'admin', // TODO: Get actual admin user ID
        rejectionReason: notes.trim() || 'Pembayaran ditolak oleh admin',
        paymentProofUrl: order.paymentMethod === 'transfer' ? null : order.paymentProofUrl, // Hapus bukti transfer jika transfer
        updatedAt: serverTimestamp(),
      })
      
      showToast(`❌ Pembayaran ditolak. Customer akan diberitahu.`, 'success')
      onClose()
    } catch (error) {
      console.error('Failed to reject payment:', error)
      showToast('Gagal menolak pembayaran', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50))
  const handleZoomReset = () => setZoom(100)
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-50 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800">
                {order.paymentMethod === 'transfer' ? 'Verifikasi Transfer' : 'Konfirmasi Pembayaran'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Order: <span className="font-mono font-semibold">{order.orderNumber}</span>
                {' • '}
                <span className="font-semibold">
                  {order.paymentMethod === 'transfer' ? '💳 Transfer/QRIS' : '💵 Cash on Pickup'}
                </span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
            >
              ×
            </button>
          </div>
          
          {/* Warning Banner or Status Info */}
          {order.status === 'pending_payment' ? (
            <div className={`mt-3 px-4 py-2 rounded-lg ${
              order.paymentMethod === 'transfer' 
                ? 'bg-blue-50 border border-blue-200' 
                : 'bg-green-50 border border-green-200'
            }`}>
              <p className={`text-xs font-medium ${
                order.paymentMethod === 'transfer' ? 'text-blue-800' : 'text-green-800'
              }`}>
                {order.paymentMethod === 'transfer' 
                  ? '⚠️ Pastikan bukti transfer VALID sebelum approve. System akan minta konfirmasi final.'
                  : '⚠️ Pastikan customer SUDAH DATANG dan BAYAR TUNAI. System akan minta konfirmasi final.'
                }
              </p>
            </div>
          ) : (
            <div className="mt-3 px-4 py-2 rounded-lg bg-gray-100 border border-gray-300">
              <p className="text-xs text-gray-600">
                📋 Status Order: <span className="font-semibold">{order.status || 'unknown'}</span>
                {' • '}
                <span className="text-gray-500">
                  Tombol konfirmasi hanya muncul untuk status "pending_payment"
                </span>
              </p>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left: Payment Proof Image */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  {order.paymentMethod === 'transfer' ? 'Bukti Transfer' : 'Info Pembayaran'}
                </h3>
                
                {/* Image Container */}
                <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden" style={{ height: '500px' }}>
                  {order.paymentMethod === 'transfer' && order.paymentProofUrl ? (
                    <div className="w-full h-full overflow-auto flex items-center justify-center">
                      <img
                        src={order.paymentProofUrl}
                        alt="Payment proof"
                        style={{
                          transform: `scale(${zoom / 100})`,
                          transition: 'transform 0.2s',
                          maxWidth: 'none',
                        }}
                        className="cursor-zoom-in"
                      />
                    </div>
                  ) : order.paymentMethod === 'cash' ? (
                    <div className="w-full h-full flex items-center justify-center bg-green-50">
                      <div className="text-center">
                        <span className="text-6xl">💵</span>
                        <p className="mt-4 text-lg font-semibold text-green-700">Cash on Pickup</p>
                        <p className="text-sm text-green-600 mt-2">Customer akan bayar tunai<br/>saat mengambil produk</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <span className="text-6xl">📷</span>
                        <p className="mt-2">Belum upload bukti transfer</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Zoom Controls (hanya untuk transfer) */}
                {order.paymentMethod === 'transfer' && order.paymentProofUrl && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <button
                    onClick={handleZoomOut}
                    disabled={zoom <= 50}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition disabled:opacity-50"
                  >
                    Zoom Out -
                  </button>
                  <span className="px-4 py-2 bg-gray-100 rounded font-medium text-gray-700">
                    {zoom}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    disabled={zoom >= 200}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition disabled:opacity-50"
                  >
                    Zoom In +
                  </button>
                  <button
                    onClick={handleZoomReset}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                  >
                    Reset 100%
                  </button>
                </div>
                )}
              </div>
            </div>
            
            {/* Right: Order Details */}
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Informasi Customer
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nama:</span>
                    <span className="font-medium text-gray-900">
                      {order.customerName || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium text-gray-900">
                      {order.customerEmail || 'N/A'}
                    </span>
                  </div>
                  {order.customerPhone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Telepon:</span>
                      <span className="font-medium text-gray-900">
                        {order.customerPhone}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Order Items */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Item Pesanan
                </h3>
                <div className="space-y-2">
                  {order.items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {item.name || 'Unknown'} × {item.quantity || 0}
                      </span>
                      <span className="font-medium text-gray-900">
                        Rp {((item.price || 0) * (item.quantity || 0)).toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                  
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                    <span className="text-gray-800">Total:</span>
                    <span className="text-blue-600 text-lg">
                      Rp {(order.totalAmount || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Verification Notes */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Catatan <span className="text-sm text-gray-500 font-normal">(opsional)</span>
                </h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder={order.paymentMethod === 'transfer' 
                    ? 'cth: Transfer verified via rekening bank, Nominal tidak sesuai, Bukti tidak valid...'
                    : 'cth: Customer sudah datang dan bayar tunai, Customer belum datang...'
                  }
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {notes.length}/500 karakter
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="bg-gray-50 border-t px-6 py-4">
          {order.status === 'pending_payment' ? (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">Pintasan Keyboard:</p>
                <p><kbd className="px-2 py-1 bg-white border rounded text-xs">A</kbd> = Approve</p>
                <p><kbd className="px-2 py-1 bg-white border rounded text-xs">R</kbd> = Reject</p>
                <p><kbd className="px-2 py-1 bg-white border rounded text-xs">Esc</kbd> = Tutup</p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  <span>✗</span>
                  <span>{loading ? 'Memproses...' : 'Tolak Pembayaran'}</span>
                </button>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  <span>✓</span>
                  <span>
                    {loading 
                      ? 'Memproses...' 
                      : order.paymentMethod === 'transfer' 
                        ? 'Konfirmasi Transfer Diterima' 
                        : 'Konfirmasi Tunai Diterima'
                    }
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(order.status === 'paid' || order.status === 'completed') && (
                  <div className="flex items-center gap-2 text-green-700">
                    <span className="text-2xl">✅</span>
                    <div>
                      <p className="font-semibold">Pembayaran Berhasil</p>
                      <p className="text-sm">Order sudah diverifikasi dan approved</p>
                    </div>
                  </div>
                )}
                {(order.status === 'payment_rejected' || order.status === 'cancelled') && (
                  <div className="flex items-center gap-2 text-red-700">
                    <span className="text-2xl">❌</span>
                    <div>
                      <p className="font-semibold">Pembayaran Dibatalkan</p>
                      <p className="text-sm">Order ditolak atau dibatalkan</p>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
              >
                Tutup
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Approve Confirmation Modal */}
      <ConfirmationModal
        isOpen={showApproveConfirm}
        onClose={() => setShowApproveConfirm(false)}
        onConfirm={confirmApprove}
        title={order.paymentMethod === 'transfer' ? 'Konfirmasi Transfer Diterima' : 'Konfirmasi Tunai Diterima'}
        type="success"
        icon={order.paymentMethod === 'transfer' ? '💳' : '💵'}
        confirmText="Ya, Konfirmasi"
        cancelText="Batal"
        loading={loading}
        message={
          <div className="space-y-3">
            <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order:</span>
                <span className="font-semibold font-mono">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <span className="font-semibold">{order.customerName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Metode:</span>
                <span className="font-semibold">
                  {order.paymentMethod === 'transfer' ? 'Transfer/QRIS' : 'Cash on Pickup'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-bold text-blue-600">
                  Rp {(order.totalAmount || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
            
            <div className="border-t pt-3">
              <p className="font-semibold text-gray-800 mb-2">
                {order.paymentMethod === 'transfer' 
                  ? 'Apakah Anda yakin bukti transfer VALID dan sudah diterima?'
                  : 'Apakah customer sudah DATANG dan BAYAR TUNAI?'
                }
              </p>
              <p className="text-sm text-gray-600">
                Order akan diubah status menjadi <span className="font-semibold text-green-600">PAID</span> dan masuk ke keuangan.
              </p>
            </div>
          </div>
        }
      />
      
      {/* Reject Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRejectConfirm}
        onClose={() => setShowRejectConfirm(false)}
        onConfirm={confirmReject}
        title="Tolak Pembayaran"
        type="danger"
        icon="❌"
        confirmText="Ya, Tolak"
        cancelText="Batal"
        loading={loading}
        message={
          <div className="space-y-3">
            <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order:</span>
                <span className="font-semibold font-mono">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <span className="font-semibold">{order.customerName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Metode:</span>
                <span className="font-semibold">
                  {order.paymentMethod === 'transfer' ? 'Transfer/QRIS' : 'Cash on Pickup'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-bold text-blue-600">
                  Rp {(order.totalAmount || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
            
            {notes.trim() && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                <p className="text-sm font-semibold text-yellow-800 mb-1">Alasan Penolakan:</p>
                <p className="text-sm text-yellow-700">{notes.trim()}</p>
              </div>
            )}
            
            <div className="border-t pt-3">
              <p className="font-semibold text-gray-800 mb-2">
                ⚠️ Customer akan diminta untuk:
              </p>
              <p className="text-sm text-gray-600">
                {order.paymentMethod === 'transfer' 
                  ? '• Upload ulang bukti transfer yang valid'
                  : '• Datang kembali dan bayar tunai'
                }
              </p>
            </div>
          </div>
        }
      />
    </div>
  )
}
