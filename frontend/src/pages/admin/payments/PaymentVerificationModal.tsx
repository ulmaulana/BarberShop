import { useState, useEffect } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { firestore } from '../../../config/firebase'
import { useToast } from '../../../contexts/ToastContext'

interface Order {
  id: string
  orderNumber: string
  customerId: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  items: any[]
  total: number
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
  
  const handleApprove = async () => {
    if (!confirm('Approve this payment? Order will be marked as PAID.')) return
    
    try {
      setLoading(true)
      
      await updateDoc(doc(firestore, 'orders', order.id), {
        status: 'paid',
        paymentVerifiedAt: serverTimestamp(),
        paymentVerifiedBy: 'admin', // TODO: Get actual admin user ID
        verificationNotes: notes.trim() || 'Payment approved',
        updatedAt: serverTimestamp(),
      })
      
      showToast('Payment approved successfully!', 'success')
      onClose()
    } catch (error) {
      console.error('Failed to approve payment:', error)
      showToast('Failed to approve payment', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  const handleReject = async () => {
    if (!notes.trim()) {
      showToast('Please provide rejection reason in notes', 'error')
      return
    }
    
    if (!confirm('Reject this payment? Customer will need to re-upload payment proof.')) return
    
    try {
      setLoading(true)
      
      await updateDoc(doc(firestore, 'orders', order.id), {
        status: 'payment_rejected',
        paymentRejectedAt: serverTimestamp(),
        paymentRejectedBy: 'admin', // TODO: Get actual admin user ID
        rejectionReason: notes.trim(),
        paymentProofUrl: null, // Remove invalid proof
        updatedAt: serverTimestamp(),
      })
      
      showToast('Payment rejected. Customer will be notified.', 'success')
      onClose()
    } catch (error) {
      console.error('Failed to reject payment:', error)
      showToast('Failed to reject payment', 'error')
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
        <div className="bg-gray-50 border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Verify Payment</h2>
            <p className="text-sm text-gray-600 mt-1">
              Order: <span className="font-mono font-semibold">{order.orderNumber}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
          >
            ×
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left: Payment Proof Image */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Payment Proof
                </h3>
                
                {/* Image Container */}
                <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden" style={{ height: '500px' }}>
                  {order.paymentProofUrl ? (
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
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <span className="text-6xl">📷</span>
                        <p className="mt-2">No payment proof uploaded</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Zoom Controls */}
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
              </div>
            </div>
            
            {/* Right: Order Details */}
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Customer Information
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium text-gray-900">
                      {order.customerName || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium text-gray-900">
                      {order.customerEmail}
                    </span>
                  </div>
                  {order.customerPhone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
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
                  Order Items
                </h3>
                <div className="space-y-2">
                  {order.items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {item.name} × {item.quantity}
                      </span>
                      <span className="font-medium text-gray-900">
                        Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                  
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                    <span className="text-gray-800">Total:</span>
                    <span className="text-blue-600 text-lg">
                      Rp {order.total.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Verification Notes */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Notes <span className="text-sm text-gray-500 font-normal">(optional for approval, required for rejection)</span>
                </h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="e.g. Payment verified via bank statement, Payment amount mismatch, Invalid proof..."
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {notes.length}/500 characters
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="bg-gray-50 border-t px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-1">Keyboard Shortcuts:</p>
              <p><kbd className="px-2 py-1 bg-white border rounded text-xs">A</kbd> = Approve</p>
              <p><kbd className="px-2 py-1 bg-white border rounded text-xs">R</kbd> = Reject</p>
              <p><kbd className="px-2 py-1 bg-white border rounded text-xs">Esc</kbd> = Close</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={loading}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 flex items-center gap-2"
              >
                <span>✗</span>
                <span>Reject Payment</span>
              </button>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 flex items-center gap-2"
              >
                <span>✓</span>
                <span>Approve Payment</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
