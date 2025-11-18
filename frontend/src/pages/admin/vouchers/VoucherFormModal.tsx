import { useState, useEffect } from 'react'
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore'
import { adminFirestore } from '../../../config/firebaseAdmin'
import { useToast } from '../../../contexts/ToastContext'

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

interface VoucherFormModalProps {
  voucher: Voucher | null
  onClose: () => void
}

export function VoucherFormModal({ voucher, onClose }: VoucherFormModalProps) {
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  // Form fields
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [minPurchase, setMinPurchase] = useState<number>(0)
  const [maxDiscount, setMaxDiscount] = useState<number | ''>('')
  const [isActive, setIsActive] = useState(true)
  const [expiryDate, setExpiryDate] = useState('')
  const [usageLimit, setUsageLimit] = useState<number | ''>('')

  useEffect(() => {
    if (voucher) {
      setCode(voucher.code)
      setDiscountType(voucher.discountType)
      setDiscountValue(voucher.discountValue)
      setMinPurchase(voucher.minPurchase)
      setMaxDiscount(voucher.maxDiscount || '')
      setIsActive(voucher.isActive)
      setExpiryDate(voucher.expiryDate.split('T')[0]) // Format for input[type="date"]
      setUsageLimit(voucher.usageLimit || '')
    } else {
      // Set default expiry date to 30 days from now
      const defaultExpiry = new Date()
      defaultExpiry.setDate(defaultExpiry.getDate() + 30)
      setExpiryDate(defaultExpiry.toISOString().split('T')[0])
    }
  }, [voucher])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!code.trim()) {
      showToast('Please enter voucher code', 'error')
      return
    }

    if (discountValue <= 0) {
      showToast('Discount value must be greater than 0', 'error')
      return
    }

    if (discountType === 'percentage' && discountValue > 100) {
      showToast('Percentage discount cannot exceed 100%', 'error')
      return
    }

    if (minPurchase < 0) {
      showToast('Minimum purchase cannot be negative', 'error')
      return
    }

    if (!expiryDate) {
      showToast('Please select expiry date', 'error')
      return
    }

    setSubmitting(true)

    try {
      const voucherData = {
        code: code.toUpperCase().trim(),
        discountType,
        discountValue,
        minPurchase,
        maxDiscount: maxDiscount || null,
        isActive,
        expiryDate: new Date(expiryDate).toISOString(),
        usageLimit: usageLimit || null,
        usedCount: voucher?.usedCount || 0,
      }

      if (voucher) {
        // Update existing voucher
        await updateDoc(doc(adminFirestore, 'vouchers', voucher.id), voucherData)
        showToast('Voucher updated successfully', 'success')
      } else {
        // Create new voucher
        await addDoc(collection(adminFirestore, 'vouchers'), {
          ...voucherData,
          createdAt: new Date().toISOString(),
        })
        showToast('Voucher created successfully', 'success')
      }

      onClose()
    } catch (error) {
      console.error('Error saving voucher:', error)
      showToast('Failed to save voucher', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {voucher ? 'Edit Voucher' : 'Add New Voucher'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Voucher Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voucher Code *
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              placeholder="e.g., WELCOME10"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use uppercase letters and numbers only
            </p>
          </div>

          {/* Discount Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discount Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition ${
                discountType === 'percentage' 
                  ? 'border-blue-600 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="discountType"
                  value="percentage"
                  checked={discountType === 'percentage'}
                  onChange={(e) => setDiscountType(e.target.value as 'percentage')}
                  className="mr-2"
                />
                <span className="font-medium">Percentage (%)</span>
              </label>
              <label className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition ${
                discountType === 'fixed' 
                  ? 'border-blue-600 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="discountType"
                  value="fixed"
                  checked={discountType === 'fixed'}
                  onChange={(e) => setDiscountType(e.target.value as 'fixed')}
                  className="mr-2"
                />
                <span className="font-medium">Fixed Amount (Rp)</span>
              </label>
            </div>
          </div>

          {/* Discount Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discount Value *
            </label>
            <div className="relative">
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                required
                min="0"
                max={discountType === 'percentage' ? 100 : undefined}
                step={discountType === 'percentage' ? 1 : 1000}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                {discountType === 'percentage' ? '%' : 'Rp'}
              </span>
            </div>
            {discountType === 'percentage' && (
              <p className="text-xs text-gray-500 mt-1">
                Enter value between 1-100
              </p>
            )}
          </div>

          {/* Max Discount (for percentage) */}
          {discountType === 'percentage' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Discount (Optional)
              </label>
              <input
                type="number"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value ? Number(e.target.value) : '')}
                min="0"
                step="1000"
                placeholder="e.g., 50000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Cap the maximum discount amount in Rupiah
              </p>
            </div>
          )}

          {/* Min Purchase */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Purchase *
            </label>
            <input
              type="number"
              value={minPurchase}
              onChange={(e) => setMinPurchase(Number(e.target.value))}
              required
              min="0"
              step="1000"
              placeholder="e.g., 100000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum order amount to use this voucher
            </p>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiry Date *
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              required
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Usage Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usage Limit (Optional)
            </label>
            <input
              type="number"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value ? Number(e.target.value) : '')}
              min="1"
              placeholder="e.g., 100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum number of times this voucher can be used (leave empty for unlimited)
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Active (voucher can be used immediately)
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50"
            >
              {submitting ? 'Saving...' : voucher ? 'Update Voucher' : 'Create Voucher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
