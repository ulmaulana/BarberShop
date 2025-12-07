import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { adminFirestore } from '../../../config/firebaseAdmin'
import { useToast } from '../../../contexts/ToastContext'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'
import { PaymentVerificationModal } from './PaymentVerificationModal'
import { PaymentsSkeleton } from '../../../components/admin/SkeletonLoader'

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
  paymentProofUploadedAt?: any
  status: string
  createdAt: any
  updatedAt: any
}

type StatusFilter = 'all' | 'pending' | 'paid' | 'cancelled'
type PaymentMethodFilter = 'all' | 'transfer' | 'cash'

export function PaymentsListPage() {
  const { user, loading: authLoading } = useAdminAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethodFilter>('all')
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const { showToast } = useToast()
  
  useEffect(() => {
    if (!authLoading && user) {
      loadOrders()
    }
  }, [authLoading, user])
  
  const loadOrders = async () => {
    try {
      setLoading(true)
      const ordersRef = collection(adminFirestore, 'orders')
      
      // Get semua orders (pending, paid, cancelled, rejected)
      const snapshot = await getDocs(ordersRef)
      
      let ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[]
      
      // Sort by createdAt descending (terbaru dulu)
      ordersData.sort((a, b) => {
        const timeA = a.paymentProofUploadedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0
        const timeB = b.paymentProofUploadedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0
        return timeB - timeA
      })
      
      setOrders(ordersData)
    } catch (error) {
      console.error('Failed to load orders:', error)
      showToast('Gagal memuat orders', 'error')
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
    loadOrders() // Reload after verification
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
  
  // Filter by status
  const getFilteredByStatus = () => {
    switch (statusFilter) {
      case 'pending':
        return orders.filter(o => o.status === 'pending_payment')
      case 'paid':
        return orders.filter(o => o.status === 'paid' || o.status === 'completed')
      case 'cancelled':
        return orders.filter(o => o.status === 'payment_rejected' || o.status === 'cancelled')
      default:
        return orders
    }
  }
  
  // Filter by payment method
  const filteredPayments = paymentMethodFilter === 'all'
    ? getFilteredByStatus()
    : getFilteredByStatus().filter(o => o.paymentMethod === paymentMethodFilter)
  
  // Counts for tabs
  const pendingCount = orders.filter(o => o.status === 'pending_payment').length
  const paidCount = orders.filter(o => o.status === 'paid' || o.status === 'completed').length
  const cancelledCount = orders.filter(o => o.status === 'payment_rejected' || o.status === 'cancelled').length
  
  if (authLoading || loading) {
    return <PaymentsSkeleton />
  }
  
  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-gray-600">Unauthorized - Admin login required</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Payment Management</p>
          <h1 className="text-4xl font-light text-gray-900">Pembayaran</h1>
          <p className="text-sm text-gray-500 mt-2">
            {filteredPayments.length} transaksi ditampilkan
          </p>
        </div>
        
        <button
          onClick={loadOrders}
          className="px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors"
        >
          Refresh
        </button>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
        {/* Status Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded transition-all ${
              statusFilter === 'all' 
                ? 'bg-gray-900 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Semua
            <span className="ml-2 text-xs opacity-75">({orders.length})</span>
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 text-sm font-medium rounded transition-all ${
              statusFilter === 'pending' 
                ? 'bg-amber-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pending
            <span className="ml-2 text-xs opacity-75">({pendingCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-4 py-2 text-sm font-medium rounded transition-all ${
              statusFilter === 'paid' 
                ? 'bg-emerald-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Verified
            <span className="ml-2 text-xs opacity-75">({paidCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`px-4 py-2 text-sm font-medium rounded transition-all ${
              statusFilter === 'cancelled' 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Cancelled
            <span className="ml-2 text-xs opacity-75">({cancelledCount})</span>
          </button>
        </div>
        
        <div className="h-8 w-px bg-gray-300"></div>
      
        {/* Payment Method Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setPaymentMethodFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
              paymentMethodFilter === 'all' 
                ? 'bg-gray-900 text-white' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Methods
          </button>
          <button
            onClick={() => setPaymentMethodFilter('transfer')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
              paymentMethodFilter === 'transfer' 
                ? 'bg-gray-900 text-white' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Transfer
          </button>
          <button
            onClick={() => setPaymentMethodFilter('cash')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
              paymentMethodFilter === 'cash' 
                ? 'bg-gray-900 text-white' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Cash
          </button>
        </div>
      </div>
      
      
      {/* Payments Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPayments.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  {/* Order Number */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                        {order.paymentMethod === 'transfer' && order.paymentProofUrl ? (
                          <img
                            src={order.paymentProofUrl}
                            alt="Proof"
                            className="w-full h-full object-cover cursor-pointer hover:opacity-75 transition"
                            onClick={() => handleVerify(order)}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-mono text-gray-900">{order.orderNumber}</p>
                        <p className="text-xs text-gray-500">{order.items?.length || 0} items</p>
                      </div>
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {order.customerName || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.customerEmail}
                    </div>
                  </td>

                  {/* Payment Method */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {order.paymentMethod === 'transfer' ? 'Transfer' : 'Cash'}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      Rp {(order.totalAmount || 0).toLocaleString('id-ID')}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {order.status === 'pending_payment' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
                        Pending
                      </span>
                    )}
                    {(order.status === 'paid' || order.status === 'completed') && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                        Verified
                      </span>
                    )}
                    {(order.status === 'payment_rejected' || order.status === 'cancelled') && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                        Cancelled
                      </span>
                    )}
                  </td>

                  {/* Time */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.paymentProofUploadedAt 
                      ? getTimeSinceUpload(order.paymentProofUploadedAt)
                      : '-'
                    }
                  </td>

                  {/* Action */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {order.status === 'pending_payment' ? (
                      <button
                        onClick={() => handleVerify(order)}
                        className="inline-flex items-center px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded hover:bg-gray-800 transition-colors"
                      >
                        Verify
                      </button>
                    ) : (
                      <button
                        onClick={() => handleVerify(order)}
                        className="inline-flex items-center px-3 py-1.5 text-gray-700 text-xs font-medium hover:text-gray-900 transition-colors"
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {filteredPayments.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No payments found
          </h3>
          <p className="text-sm text-gray-500">
            {statusFilter === 'pending' && 'No pending payments at the moment.'}
            {statusFilter === 'paid' && 'No verified payments yet.'}
            {statusFilter === 'cancelled' && 'No cancelled payments.'}
            {statusFilter === 'all' && 'No payments available.'}
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
