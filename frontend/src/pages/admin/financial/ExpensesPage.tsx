import { useState, useEffect } from 'react'
import { collection, query, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore'
import { firestore } from '../../../config/firebase'
import { useToast } from '../../../contexts/ToastContext'
import { ExpenseFormModal } from './ExpenseFormModal'

interface Expense {
  id: string
  title: string
  category: string
  amount: number
  date: any
  description?: string
  createdAt: any
}

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const { showToast } = useToast()
  
  useEffect(() => {
    loadExpenses()
  }, [])
  
  const loadExpenses = async () => {
    try {
      setLoading(true)
      const expensesRef = collection(firestore, 'expenses')
      const q = query(expensesRef, orderBy('date', 'desc'))
      const snapshot = await getDocs(q)
      
      const expensesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Expense[]
      
      setExpenses(expensesData)
    } catch (error) {
      console.error('Failed to load expenses:', error)
      showToast('Failed to load expenses', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDelete = async (expense: Expense) => {
    if (!confirm(`Delete expense "${expense.title}"?`)) return
    
    try {
      await deleteDoc(doc(firestore, 'expenses', expense.id))
      showToast('Expense deleted successfully', 'success')
      loadExpenses()
    } catch (error) {
      console.error('Failed to delete expense:', error)
      showToast('Failed to delete expense', 'error')
    }
  }
  
  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setShowFormModal(true)
  }
  
  const handleAddNew = () => {
    setEditingExpense(null)
    setShowFormModal(true)
  }
  
  const handleModalClose = () => {
    setShowFormModal(false)
    setEditingExpense(null)
    loadExpenses()
  }
  
  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter
    
    return matchesSearch && matchesCategory
  })
  
  // Calculate totals
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  
  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      rent: '🏢',
      utilities: '⚡',
      supplies: '📦',
      salaries: '💼',
      marketing: '📢',
      maintenance: '🔧',
      other: '📋',
    }
    return icons[category] || '📋'
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading expenses...</div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Expenses Management</h1>
          <p className="text-gray-500 mt-1">
            Total: Rp {totalExpenses.toLocaleString('id-ID')}
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition"
        >
          + Add Expense
        </button>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="🔍 Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="rent">Rent</option>
              <option value="utilities">Utilities</option>
              <option value="supplies">Supplies</option>
              <option value="salaries">Salaries</option>
              <option value="marketing">Marketing</option>
              <option value="maintenance">Maintenance</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Expenses Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expense
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  {/* Expense */}
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {expense.title}
                      </div>
                      {expense.description && (
                        <div className="text-sm text-gray-500 truncate max-w-md">
                          {expense.description}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  {/* Category */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      {getCategoryIcon(expense.category)}
                      <span className="capitalize">{expense.category}</span>
                    </span>
                  </td>
                  
                  {/* Amount */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-red-600">
                      Rp {expense.amount.toLocaleString('id-ID')}
                    </span>
                  </td>
                  
                  {/* Date */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {expense.date?.toDate?.()
                      ? new Date(expense.date.toDate()).toLocaleDateString('id-ID')
                      : '-'
                    }
                  </td>
                  
                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(expense)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(expense)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredExpenses.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No expenses found
          </div>
        )}
      </div>
      
      {/* Form Modal */}
      {showFormModal && (
        <ExpenseFormModal
          expense={editingExpense}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}
