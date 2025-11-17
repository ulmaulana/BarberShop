import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { firestore } from '../../../config/firebase'

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
}

interface Order {
  id: string
  orderNumber: string
  total: number
  status: string
  createdAt: any
}

interface Props {
  user: User
  onClose: () => void
}

export function UserDetailModal({ user, onClose }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  
  useEffect(() => {
    loadUserOrders()
  }, [user.id])
  
  const loadUserOrders = async () => {
    try {
      setLoadingOrders(true)
      const ordersRef = collection(firestore, 'orders')
      const q = query(
        ordersRef,
        where('customerId', '==', user.id),
        orderBy('createdAt', 'desc'),
        limit(10)
      )
      const snapshot = await getDocs(q)
      
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[]
      
      setOrders(ordersData)
    } catch (error) {
      console.error('Failed to load orders:', error)
      setOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }
  
  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">User Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              User Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Name</label>
                <p className="text-gray-900 font-medium">
                  {user.displayName || 'No name'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-500 mb-1">Email</label>
                <p className="text-gray-900 font-medium">{user.email}</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-500 mb-1">Phone</label>
                <p className="text-gray-900 font-medium">{user.phone || '-'}</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-500 mb-1">Role</label>
                <p className="text-gray-900 font-medium capitalize">{user.role}</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-500 mb-1">Status</label>
                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                  user.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {user.isActive ? 'Active' : 'Suspended'}
                </span>
              </div>
              
              <div>
                <label className="block text-sm text-gray-500 mb-1">Joined Date</label>
                <p className="text-gray-900 font-medium">
                  {new Date(user.createdAt).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
          
          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-sm text-blue-600 mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-blue-900">
                {user.totalOrders || 0}
              </p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-sm text-green-600 mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-green-900">
                Rp {(user.totalSpent || 0).toLocaleString('id-ID')}
              </p>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <p className="text-sm text-purple-600 mb-1">Avg. Order</p>
              <p className="text-2xl font-bold text-purple-900">
                Rp {user.totalOrders && user.totalSpent 
                  ? Math.round(user.totalSpent / user.totalOrders).toLocaleString('id-ID')
                  : '0'
                }
              </p>
            </div>
          </div>
          
          {/* Order History */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Recent Orders (Last 10)
            </h3>
            
            {loadingOrders ? (
              <div className="text-center py-8 text-gray-500">
                Loading orders...
              </div>
            ) : orders.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Order #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {order.orderNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {order.createdAt?.toDate?.()
                            ? new Date(order.createdAt.toDate()).toLocaleDateString('id-ID')
                            : '-'
                          }
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          Rp {order.total.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                No orders yet
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
