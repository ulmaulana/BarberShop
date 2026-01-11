import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { formatCurrency } from '../../../utils/format'
import {
  Search,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Calendar,
  User,
  X,
  Lock,
  RefreshCw
} from 'lucide-react'
import { adminFirestore } from '../../../config/firebaseAdmin'
import { useToast } from '../../../contexts/ToastContext'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'
import { PaymentsSkeleton } from '../../../components/admin/SkeletonLoader'

interface Payment {
  id: string
  orderId: string // Changed from orderNumber
  customerId: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  items: any[]
  amount: number // Changed from totalAmount
  paymentMethod: 'bank_transfer' | 'E-Wallet' // Changed from 'transfer' | 'cash'
  paymentProofUrl?: string
  paymentProofUploadedAt?: any
  status: 'pending' | 'success' | 'failed' | 'cancelled' // Simplified status types
  createdAt: any
  updatedAt: any
}

type FilterType = 'all' | 'pending' | 'success' | 'failed' | 'cancelled'

export function PaymentsListPage() {
  const { user, loading: authLoading } = useAdminAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (!authLoading && user) {
      loadPayments()
    }
  }, [authLoading, user])

  const loadPayments = async () => {
    try {
      setLoading(true)
      const ordersRef = collection(adminFirestore, 'orders')

      const snapshot = await getDocs(ordersRef)

      let paymentsData = snapshot.docs.map(doc => {
        const data = doc.data()
        // Map old Order structure to new Payment structure
        let status: Payment['status']
        if (data.status === 'pending_payment') status = 'pending'
        else if (data.status === 'paid' || data.status === 'completed') status = 'success'
        else if (data.status === 'payment_rejected' || data.status === 'cancelled') status = 'failed' // Assuming rejected/cancelled maps to failed for simplicity
        else status = 'pending' // Default or handle other statuses

        let paymentMethod: Payment['paymentMethod']
        if (data.paymentMethod === 'transfer') paymentMethod = 'bank_transfer'
        else if (data.paymentMethod === 'cash') paymentMethod = 'E-Wallet' // Assuming cash maps to E-Wallet for simplicity
        else paymentMethod = 'bank_transfer' // Default

        return {
          id: doc.id,
          orderId: data.orderNumber || doc.id || 'N/A', // Map orderNumber to orderId with fallback
          amount: data.totalAmount, // Map totalAmount to amount
          status: status,
          paymentMethod: paymentMethod,
          ...data
        }
      }) as Payment[]

      // Sort: pending first (oldest at top for queue), then success/failed at bottom
      paymentsData.sort((a, b) => {
        // Priority: pending > success > failed
        const statusPriority = (status: Payment['status']) => {
          if (status === 'pending') return 0
          if (status === 'success') return 1
          return 2 // failed, cancelled go to bottom
        }

        const priorityA = statusPriority(a.status)
        const priorityB = statusPriority(b.status)

        // If different priority, sort by priority
        if (priorityA !== priorityB) {
          return priorityA - priorityB
        }

        // Same priority: sort by time
        const timeA = a.paymentProofUploadedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0
        const timeB = b.paymentProofUploadedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0

        if (priorityA === 0) {
          // Pending payments: oldest first (queue order)
          return timeA - timeB
        } else {
          // Completed/cancelled: newest first
          return timeB - timeA
        }
      })

      setPayments(paymentsData)
    } catch (error) {
      console.error('Failed to load payments:', error)
      showToast('Gagal memuat pembayaran', 'error')
    } finally {
      setLoading(false)
    }
  }

  const openVerificationModal = (payment: Payment) => {
    setSelectedPayment(payment)
    setShowVerificationModal(true)
  }

  const handleCloseModal = () => {
    setShowVerificationModal(false)
    setSelectedPayment(null)
    loadPayments() // Reload after verification
  }

  const getStatusBadge = (status: Payment['status']) => {
    switch (status) {
      case 'pending':
        return 'text-amber-700 bg-amber-50 border-amber-200'
      case 'success':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200'
      case 'failed':
      case 'cancelled':
        return 'text-red-700 bg-red-50 border-red-200'
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  const getStatusLabel = (status: Payment['status']) => {
    switch (status) {
      case 'pending':
        return 'Menunggu'
      case 'success':
        return 'Berhasil'
      case 'failed':
        return 'Gagal'
      case 'cancelled':
        return 'Dibatalkan'
      default:
        return 'Tidak Diketahui'
    }
  }

  const handleVerifyPayment = async (paymentId: string, status: Payment['status']) => {
    try {
      if (!selectedPayment) return

      // Update order status in Firestore
      // Map status back to old system for compatibility
      let orderStatus = ''
      if (status === 'success') orderStatus = 'paid'
      else if (status === 'failed') orderStatus = 'payment_rejected'

      const orderRef = doc(adminFirestore, 'orders', paymentId)
      await updateDoc(orderRef, {
        status: orderStatus,
        updatedAt: new Date(),
        // Add verification metadata
        verifiedAt: new Date(),
        verifiedBy: user?.email || 'admin'
      })

      showToast(`Pembayaran berhasil ${status === 'success' ? 'diverifikasi' : 'ditolak'}`, status === 'success' ? 'success' : 'error')

      // Update local state
      setPayments(payments.map(p =>
        p.id === paymentId ? { ...p, status } : p
      ))

      // Update modal state if open
      if (selectedPayment && selectedPayment.id === paymentId) {
        setSelectedPayment({ ...selectedPayment, status })
      }

      // Reload to ensure consistency
      loadPayments()

      if (status === 'success' || status === 'failed') {
        setShowVerificationModal(false)
      }

    } catch (error) {
      console.error('Error verifying payment:', error)
      showToast('Gagal memverifikasi pembayaran', 'error')
    }
  }

  const filteredPayments = useMemo(() => {
    let filtered = payments;

    if (filter !== 'all') {
      filtered = filtered.filter(payment => payment.status === filter);
    }

    if (searchQuery) {
      filtered = filtered.filter(payment =>
        (payment.orderId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (payment.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (payment.customerEmail || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [payments, filter, searchQuery]);

  if (authLoading || loading) {
    return <PaymentsSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Lock className="w-16 h-16 text-gray-400" />
          </div>
          <p className="text-gray-600">Unauthorized - Admin login required</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Riwayat Pembayaran</h1>
          <p className="text-gray-500 mt-1">Kelola dan verifikasi pembayaran pelanggan</p>
        </div>
        <button
          onClick={loadPayments}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition shadow-sm flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Segarkan
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari Order ID atau nama pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {(['all', 'pending', 'success', 'failed'] as FilterType[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${filter === status
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  } `}
              >
                {status === 'all' ? 'Semua' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Payments Table */}
      {filteredPayments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Tidak ada data pembayaran</h3>
          <p className="text-gray-500">Coba sesuaikan filter pencarian Anda</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Order Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Pelanggan
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Metode & Nominal
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">#{(payment.orderId || '').slice(0, 8)}</span>
                        <span className="text-xs text-gray-500 font-mono">{payment.orderId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-xs font-bold">
                          {payment.customerName ? payment.customerName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {payment.customerName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {payment.customerEmail}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(payment.amount)}</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          {payment.paymentMethod === 'bank_transfer' ? 'Transfer Bank' : 'E-Wallet'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(payment.status)} bg-opacity-10 border-opacity-20`}>
                        {getStatusLabel(payment.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col text-sm text-gray-500">
                        <span>{new Date(payment.createdAt?.toDate ? payment.createdAt.toDate() : payment.createdAt).toLocaleDateString()}</span>
                        <span className="text-xs">{new Date(payment.createdAt?.toDate ? payment.createdAt.toDate() : payment.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openVerificationModal(payment)}
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                      >
                        <Eye className="w-4 h-4" />
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {showVerificationModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all">
            {/* Modal Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  Verifikasi Pembayaran
                </h2>
                <p className="text-sm text-gray-500 mt-1">Order ID: #{selectedPayment.orderId}</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-500 transition-colors p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Bukti Transfer Image */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-gray-500" />
                    Bukti Transfer
                  </h3>
                  <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative group">
                    {selectedPayment.paymentProofUrl ? (
                      <a
                        href={selectedPayment.paymentProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full h-full cursor-zoom-in"
                      >
                        <img
                          src={selectedPayment.paymentProofUrl}
                          alt="Bukti Transfer"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="bg-white/90 backdrop-blur text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm text-gray-700">
                            Klik untuk memperbesar
                          </span>
                        </div>
                      </a>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <AlertCircle className="w-8 h-8 mb-2" />
                        <span className="text-sm">Tidak ada bukti upload</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Informasi Pelanggan</h3>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-500 border border-gray-200">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{selectedPayment.customerName}</p>
                          <p className="text-sm text-gray-500">{selectedPayment.customerEmail}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Detail Pembayaran</h3>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 flex items-center gap-2">
                          <CreditCard className="w-4 h-4" /> Metode
                        </span>
                        <span className="font-medium text-gray-900 capitalize">
                          {selectedPayment.paymentMethod.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 flex items-center gap-2">
                          <Calendar className="w-4 h-4" /> Tanggal
                        </span>
                        <span className="font-medium text-gray-900">
                          {new Date(selectedPayment.createdAt?.toDate ? selectedPayment.createdAt.toDate() : selectedPayment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Total</span>
                        <span className="text-xl font-bold text-blue-600">
                          {formatCurrency(selectedPayment.amount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {selectedPayment.status === 'pending' && (
                    <div className="space-y-3 pt-2">
                      <button
                        onClick={() => handleVerifyPayment(selectedPayment.id, 'success')}
                        disabled={loading}
                        className="w-full py-2.5 px-4 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm hover:shadow"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Verifikasi Pembayaran (Valid)
                      </button>
                      <button
                        onClick={() => handleVerifyPayment(selectedPayment.id, 'failed')}
                        disabled={loading}
                        className="w-full py-2.5 px-4 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-5 h-5" />
                        Tolak Pembayaran (Invalid)
                      </button>
                    </div>
                  )}

                  {selectedPayment.status !== 'pending' && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 ${selectedPayment.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                      {selectedPayment.status === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      <span className="font-medium">
                        Pembayaran telah {selectedPayment.status === 'success' ? 'diverifikasi' : 'ditolak'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
