import { useState, useEffect } from 'react'
import { collection, query, getDocs, updateDoc, doc, where } from 'firebase/firestore'
import { firestore } from '../../../config/firebase'
import { useToast } from '../../../contexts/ToastContext'
import { UserDetailModal } from './UserDetailModal'
import {
  Search,
  Filter,
  User as UserIcon,
  Mail,
  Phone,
  ShoppingBag,
  DollarSign,
  Calendar,
  Eye,
  Power,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface User {
  id: string
  email: string
  displayName?: string
  phone?: string
  role: string
  isActive: boolean
  totalOrders?: number
  totalSpent?: number
  lastOrderDate?: string
  createdAt: string
  updatedAt: string
}

export function UsersListPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const usersRef = collection(firestore, 'users')
      // Only get customers (exclude admin)
      const q = query(
        usersRef,
        where('role', '==', 'customer')
      )
      const snapshot = await getDocs(q)

      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[]

      // Sort by createdAt on client side
      usersData.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime()
        const dateB = new Date(b.createdAt || 0).getTime()
        return dateB - dateA
      })

      setUsers(usersData)
    } catch (error) {
      console.error('Failed to load users:', error)
      showToast('Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (user: User) => {
    const action = user.isActive ? 'suspend' : 'activate'
    if (!confirm(`${action === 'suspend' ? 'Suspend' : 'Activate'} user "${user.email}"?`)) return

    try {
      await updateDoc(doc(firestore, 'users', user.id), {
        isActive: !user.isActive,
        updatedAt: new Date(),
      })

      showToast(`User ${action}d successfully`, 'success')
      loadUsers()
    } catch (error) {
      console.error(`Failed to ${action} user:`, error)
      showToast(`Failed to ${action} user`, 'error')
    }
  }

  const handleViewDetail = (user: User) => {
    setSelectedUser(user)
    setShowDetailModal(true)
  }

  const handleCloseModal = () => {
    setShowDetailModal(false)
    setSelectedUser(null)
    loadUsers()
  }

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.displayName && user.displayName.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'suspended' && !user.isActive)

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading users...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
        <p className="text-gray-500 mt-1">{filteredUsers.length} customers registered</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white transition-all"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Statistics
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  {/* User */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${user.isActive ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-gray-900">
                          {user.displayName || 'No name'}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {user.phone || '-'}
                    </div>
                  </td>

                  {/* Statistics */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="text-sm text-gray-900 flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{user.totalOrders || 0} orders</span>
                      </div>
                      <div className="text-sm text-green-600 flex items-center gap-2 font-medium">
                        <DollarSign className="w-4 h-4" />
                        Rp {(user.totalSpent || 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${user.isActive
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                      {user.isActive ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" /> Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1" /> Suspended
                        </>
                      )}
                    </span>
                  </td>

                  {/* Joined Date */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {new Date(user.createdAt).toLocaleDateString('id-ID')}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewDetail(user)}
                        className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`p-2 rounded-lg transition ${user.isActive
                          ? 'text-red-600 hover:text-red-900 hover:bg-red-50'
                          : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                          }`}
                        title={user.isActive ? 'Suspend User' : 'Activate User'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No users found</h3>
            <p className="text-gray-500">Try adjusting your search filters</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
