import { useState, useEffect } from 'react'
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore'
import { adminFirestore } from '../../../config/firebaseAdmin'
import { useToast } from '../../../contexts/ToastContext'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { formatCurrency } from '../../../utils/format'
import { VoucherFormModal } from './VoucherFormModal'

interface Voucher {
  id: string
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minPurchase: number
  maxDiscount?: number
  isActive: boolean
  expiryDate: string
  usageLimit?: number
  usedCount: number
}

export function VouchersListPage() {
  const { showToast } = useToast()
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadVouchers()
  }, [])

  const loadVouchers = async () => {
    try {
      setLoading(true)
      const vouchersRef = collection(adminFirestore, 'vouchers')
      const snapshot = await getDocs(vouchersRef)
      
      const vouchersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Voucher[]

      // Sort by created date (newest first)
      vouchersData.sort((a, b) => {
        return new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime()
      })

      setVouchers(vouchersData)
    } catch (error) {
      console.error('Error loading vouchers:', error)
      showToast('Failed to load vouchers', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingVoucher(null)
    setShowModal(true)
  }

  const handleEdit = (voucher: Voucher) => {
    setEditingVoucher(voucher)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voucher?')) return

    setDeletingId(id)
    try {
      await deleteDoc(doc(adminFirestore, 'vouchers', id))
      setVouchers(vouchers.filter(v => v.id !== id))
      showToast('Voucher deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting voucher:', error)
      showToast('Failed to delete voucher', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (voucher: Voucher) => {
    try {
      await updateDoc(doc(adminFirestore, 'vouchers', voucher.id), {
        isActive: !voucher.isActive
      })
      setVouchers(vouchers.map(v => 
        v.id === voucher.id ? { ...v, isActive: !v.isActive } : v
      ))
      showToast(`Voucher ${!voucher.isActive ? 'activated' : 'deactivated'}`, 'success')
    } catch (error) {
      console.error('Error toggling voucher:', error)
      showToast('Failed to update voucher', 'error')
    }
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditingVoucher(null)
    loadVouchers()
  }

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date()
  }

  const isLimitReached = (voucher: Voucher) => {
    return voucher.usageLimit && voucher.usedCount >= voucher.usageLimit
  }

  const getStatusBadge = (voucher: Voucher) => {
    if (!voucher.isActive) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">Inactive</span>
    }
    if (isExpired(voucher.expiryDate)) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Expired</span>
    }
    if (isLimitReached(voucher)) {
      return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">Limit Reached</span>
    }
    return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Active</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vouchers</h1>
          <p className="text-gray-600 mt-1">Manage discount vouchers</p>
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition flex items-center gap-2"
        >
          <span className="text-xl">+</span>
          Add Voucher
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Total Vouchers</div>
          <div className="text-2xl font-bold text-gray-900">{vouchers.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Active</div>
          <div className="text-2xl font-bold text-green-600">
            {vouchers.filter(v => v.isActive && !isExpired(v.expiryDate) && !isLimitReached(v)).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Expired</div>
          <div className="text-2xl font-bold text-red-600">
            {vouchers.filter(v => isExpired(v.expiryDate)).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Total Usage</div>
          <div className="text-2xl font-bold text-blue-600">
            {vouchers.reduce((sum, v) => sum + v.usedCount, 0)}
          </div>
        </div>
      </div>

      {/* Vouchers List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {vouchers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎟️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No vouchers yet</h3>
            <p className="text-gray-600 mb-4">Create your first discount voucher</p>
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
            >
              Add Voucher
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Min Purchase
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vouchers.map((voucher) => (
                  <tr key={voucher.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎟️</span>
                        <span className="font-semibold text-gray-900">{voucher.code}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {voucher.discountType === 'percentage' ? (
                          <span className="font-medium text-blue-600">{voucher.discountValue}%</span>
                        ) : (
                          <span className="font-medium text-blue-600">{formatCurrency(voucher.discountValue)}</span>
                        )}
                        {voucher.maxDiscount && (
                          <div className="text-xs text-gray-500">
                            max {formatCurrency(voucher.maxDiscount)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatCurrency(voucher.minPurchase)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="font-medium text-gray-900">{voucher.usedCount}</span>
                      {voucher.usageLimit && (
                        <span className="text-gray-500"> / {voucher.usageLimit}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {new Date(voucher.expiryDate).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(voucher)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleActive(voucher)}
                          className={`px-3 py-1 rounded-lg font-medium transition ${
                            voucher.isActive
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {voucher.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleEdit(voucher)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(voucher.id)}
                          disabled={deletingId === voucher.id}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium transition disabled:opacity-50"
                        >
                          {deletingId === voucher.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <VoucherFormModal
          voucher={editingVoucher}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}
