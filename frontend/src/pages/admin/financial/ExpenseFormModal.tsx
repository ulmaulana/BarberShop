import { useState, useEffect } from 'react'
import { collection, addDoc, updateDoc, doc, Timestamp, serverTimestamp } from 'firebase/firestore'
import { firestore } from '../../../config/firebase'
import { useToast } from '../../../contexts/ToastContext'

interface Expense {
  id: string
  title: string
  category: string
  amount: number
  date: any
  description?: string
}

interface Props {
  expense: Expense | null
  onClose: () => void
}

export function ExpenseFormModal({ expense, onClose }: Props) {
  const [formData, setFormData] = useState({
    title: '',
    category: 'other',
    amount: 0,
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  
  useEffect(() => {
    if (expense) {
      setFormData({
        title: expense.title,
        category: expense.category,
        amount: expense.amount,
        date: expense.date?.toDate?.()
          ? new Date(expense.date.toDate()).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        description: expense.description || '',
      })
    }
  }, [expense])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.title.trim()) {
      showToast('Expense title is required', 'error')
      return
    }
    
    if (formData.amount <= 0) {
      showToast('Amount must be greater than 0', 'error')
      return
    }
    
    try {
      setLoading(true)
      
      const expenseData = {
        title: formData.title.trim(),
        category: formData.category,
        amount: formData.amount,
        date: Timestamp.fromDate(new Date(formData.date)),
        description: formData.description.trim(),
        updatedAt: serverTimestamp(),
      }
      
      if (expense) {
        // Update existing expense
        await updateDoc(doc(firestore, 'expenses', expense.id), expenseData)
        showToast('Expense updated successfully', 'success')
      } else {
        // Create new expense
        await addDoc(collection(firestore, 'expenses'), {
          ...expenseData,
          createdAt: serverTimestamp(),
        })
        showToast('Expense created successfully', 'success')
      }
      
      onClose()
    } catch (error) {
      console.error('Failed to save expense:', error)
      showToast('Failed to save expense', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">
            {expense ? 'Edit Expense' : 'Add New Expense'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expense Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. Rent Payment, Office Supplies"
              maxLength={100}
            />
          </div>
          
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="rent">🏢 Rent</option>
              <option value="utilities">⚡ Utilities (Electric, Water, Internet)</option>
              <option value="supplies">📦 Supplies (Tools, Products)</option>
              <option value="salaries">💼 Salaries & Wages</option>
              <option value="marketing">📢 Marketing & Advertising</option>
              <option value="maintenance">🔧 Maintenance & Repairs</option>
              <option value="other">📋 Other</option>
            </select>
          </div>
          
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (Rp) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
              step="1000"
            />
          </div>
          
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Additional notes..."
              maxLength={500}
            />
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : expense ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
