import { useState, useEffect } from 'react'
import { collection, doc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { adminFirestore } from '../../../config/firebaseAdmin'
import { useToast } from '../../../contexts/ToastContext'
import { VouchersSkeleton } from '../../../components/admin/SkeletonLoader'
import { formatCurrency } from '../../../utils/format'
import { VoucherFormModal } from './VoucherFormModal'
import {
  Tag,
  Ticket,
  Percent,
  DollarSign,
  Calendar,
  Users,
  Power,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus
} from 'lucide-react'

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

  // Real-time listener for vouchers
  useEffect(() => {
    setLoading(true)
    const vouchersRef = collection(adminFirestore, 'vouchers')

    const unsubscribe = onSnapshot(vouchersRef, (snapshot) => {
      const vouchersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Voucher[]

      // Sort by created date (newest first)
      vouchersData.sort((a, b) => {
        return new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime()
      })

      setVouchers(vouchersData)
      setLoading(false)
    }, (error) => {
      console.error('Error loading vouchers:', error)
      showToast('Failed to load vouchers', 'error')
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

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
    // Real-time listener will auto-update
  }

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date()
  }

  const isLimitReached = (voucher: Voucher) => {
    return voucher.usageLimit && voucher.usedCount >= voucher.usageLimit
  }

  const getStatusBadge = (voucher: Voucher) => {
    if (!voucher.isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
          <Power className="w-3 h-3" />
          Tidak Aktif
        </span>
      )
    }
    if (isExpired(voucher.expiryDate)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
          <AlertCircle className="w-3 h-3" />
          Kedaluwarsa
        </span>
      )
    }
    if (isLimitReached(voucher)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100">
          <AlertCircle className="w-3 h-3" />
          Batas Tercapai
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
        <CheckCircle className="w-3 h-3" />
        Aktif
      </span>
    )
  }

  if (loading) {
    return <VouchersSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Manajemen Voucher</h1>
          <p className="text-gray-500 mt-1">Kelola kode diskon dan promosi</p>
        </div>
        <button
          onClick={handleAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Tambah Voucher
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Voucher</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{vouchers.length}</h3>
          </div>
          <div className="p-2 bg-blue-50 rounded-lg">
            <Ticket className="w-5 h-5 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Voucher Aktif</p>
            <h3 className="text-2xl font-bold text-green-600 mt-1">
              {vouchers.filter(v => v.isActive && !isExpired(v.expiryDate) && !isLimitReached(v)).length}
            </h3>
          </div>
          <div className="p-2 bg-green-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Kedaluwarsa</p>
            <h3 className="text-2xl font-bold text-red-600 mt-1">
              {vouchers.filter(v => isExpired(v.expiryDate)).length}
            </h3>
          </div>
          <div className="p-2 bg-red-50 rounded-lg">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Penggunaan</p>
            <h3 className="text-2xl font-bold text-blue-600 mt-1">
              {vouchers.reduce((sum, v) => sum + v.usedCount, 0)}
            </h3>
          </div>
          <div className="p-2 bg-purple-50 rounded-lg">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Vouchers List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {vouchers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum ada voucher</h3>
            <p className="text-gray-500 mb-4">Buat voucher diskon pertama Anda</p>
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-sm"
            >
              Buat Voucher Baru
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Kode Voucher
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Nilai Diskon
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Ketentuan
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Penggunaan
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Masa Berlaku
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vouchers.map((voucher) => (
                  <tr key={voucher.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                          <Tag className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <span className="block font-mono font-bold text-gray-900">{voucher.code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {voucher.discountType === 'percentage' ? (
                          <Percent className="w-4 h-4 text-gray-400" />
                        ) : (
                          <DollarSign className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="font-semibold text-gray-900">
                          {voucher.discountType === 'percentage'
                            ? `${voucher.discountValue}%`
                            : formatCurrency(voucher.discountValue)
                          }
                        </span>
                      </div>
                      {voucher.maxDiscount && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          Maks. {formatCurrency(voucher.maxDiscount)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      Min. {formatCurrency(voucher.minPurchase)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{voucher.usedCount}</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-gray-500">{voucher.usageLimit || '∞'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(voucher.expiryDate).toLocaleDateString('id-ID')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(voucher)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleActive(voucher)}
                          className={`p-1.5 rounded-lg transition-colors ${voucher.isActive
                              ? 'text-green-600 hover:text-green-900 hover:bg-green-50'
                              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                            }`}
                          title={voucher.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(voucher)}
                          className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Voucher"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(voucher.id)}
                          disabled={deletingId === voucher.id}
                          className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Hapus Voucher"
                        >
                          <Trash2 className="w-4 h-4" />
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
