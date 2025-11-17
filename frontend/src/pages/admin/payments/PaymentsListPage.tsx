import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { firestore } from '../../../config/firebase'
import { useToast } from '../../../contexts/ToastContext'
import { PaymentVerificationModal } from './PaymentVerificationModal'

interface Order {
  id: string
  orderNumber: string
  customerId: string
  customerName: string
  customerEmail: string
  items: any[]
  total: number
  paymentProofUrl?: string
  paymentProofUploadedAt?: any
  status: string
  createdAt: any
  updatedAt: any
}

export function PaymentsListPage() {
  const [pendingPayments, setPendingPayments] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const { showToast } = useToast()
  
  useEffect(() => {
    loadPendingPayments()
  }, [])
  
  const loadPendingPayments = async () => {
    try {
      setLoading(true)
      const ordersRef = collection(firestore, 'orders')
      
      // Get orders with pending payment status
      const q = query(
        ordersRef,
        where('status', '==', 'pending_payment'),
        orderBy('paymentProofUploadedAt', 'desc')
      )
      
      const snapshot = await getDocs(q)
      
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[]
      
      setPendingPayments(ordersData)
    } catch (error) {
      console.error('Failed to load pending payments:', error)
      showToast('Failed to load pending payments', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  const handleVerify = (order: Order) => {
    setSelectedOrder(order)
    setShowVerificationModal(true)
  }
  
  const handleCloseModal = () => {
    setShowVerificationModal(false)
    setSelectedOrder(null)
    loadPendingPayments() // Reload after verification
  }
  
  const getTimeSinceUpload = (uploadedAt: any) => {
    if (!uploadedAt?.toDate) return 'Just now'
    
    const now = new Date()
    const uploaded = uploadedAt.toDate()
    const diffMs = now.getTime() - uploaded.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading pending payments...</div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Payment Verification</h1>
          <p className="text-gray-500 mt-1">
            {pendingPayments.length} payments awaiting verification
          </p>
        </div>
        
        <button
          onClick={loadPendingPayments}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          🔄 Refresh
        </button>
      </div>
      
      {/* Info Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <div className="flex items-start">
          <span className="text-2xl mr-3">ℹ️</span>
          <div>
            <p className="text-sm text-blue-800 font-medium">Manual Payment Verification</p>
            <p className="text-sm text-blue-700 mt-1">
              Review each payment proof carefully before approving. Rejected payments will require customer to re-upload.
            </p>
          </div>
        </div>
      </div>
      
      {/* Payments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pendingPayments.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden"
          >
            {/* Payment Proof Thumbnail */}
            <div className="relative h-48 bg-gray-200">
              {order.paymentProofUrl ? (
                <img
                  src={order.paymentProofUrl}
                  alt="Payment proof"
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => handleVerify(order)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-4xl">📷</span>
                </div>
              )}
              
              {/* Upload Time Badge */}
              {order.paymentProofUploadedAt && (
                <div className="absolute top-3 right-3 bg-yellow-400 text-gray-800 px-3 py-1 rounded-full text-xs font-medium">
                  ⏱️ {getTimeSinceUpload(order.paymentProofUploadedAt)}
                </div>
              )}
              
              {/* Click to view overlay */}
              <div
                className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition flex items-center justify-center cursor-pointer"
                onClick={() => handleVerify(order)}
              >
                <span className="text-white text-sm font-medium opacity-0 hover:opacity-100 transition">
                  Click to Verify
                </span>
              </div>
            </div>
            
            {/* Order Info */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Order</span>
                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                  {order.orderNumber}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-800 mb-1">
                {order.customerName || order.customerEmail}
              </h3>
              
              <p className="text-sm text-gray-600 mb-3">
                {order.items?.length || 0} items
              </p>
              
              <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <span className="text-sm text-gray-500">Total</span>
                <span className="text-lg font-bold text-blue-600">
                  Rp {order.total.toLocaleString('id-ID')}
                </span>
              </div>
              
              {/* Actions */}
              <button
                onClick={() => handleVerify(order)}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                🔍 View & Verify Payment
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {pendingPayments.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            All Caught Up!
          </h3>
          <p className="text-gray-600">
            No pending payments to verify at the moment.
          </p>
        </div>
      )}
      
      {/* Verification Modal */}
      {showVerificationModal && selectedOrder && (
        <PaymentVerificationModal
          order={selectedOrder}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
