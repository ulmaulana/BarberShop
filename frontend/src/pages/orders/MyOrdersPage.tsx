import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { firestore } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { formatCurrency } from '../../utils/format'

interface OrderItem {
  productId: string
  productName: string
  quantity: number
  price: number
}

interface Order {
  id: string
  userId: string
  items: OrderItem[]
  shippingInfo: {
    fullName: string
    phone: string
    address: string
  }
  paymentMethod: string
  paymentProof?: string
  subtotal: number
  tax: number
  total: number
  status: string
  createdAt: string
}

type TabType = 'all' | 'pending_payment' | 'confirmed' | 'completed'

export function MyOrdersPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('all')

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/orders')
      return
    }
    loadOrders()
  }, [user])

  const loadOrders = async () => {
    if (!user) return

    try {
      setLoading(true)
      const ordersRef = collection(firestore, 'orders')
      const q = query(
        ordersRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(q)
      
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[]

      setOrders(ordersData)
    } catch (error) {
      console.error('Error loading orders:', error)
      showToast('Failed to load orders', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'all') return true
    return order.status === activeTab
  })

  const getStatusBadge = (status: string) => {
    const styles = {
      pending_payment: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending Payment' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Confirmed' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      payment_rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Payment Rejected' },
    }
    
    const style = styles[status as keyof typeof styles] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status }
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
            <p className="text-gray-600 mt-1">Track and manage your product orders</p>
          </div>
          <Link
            to="/products"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-sm"
          >
            Shop Products
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
          {[
            { key: 'all', label: 'All Orders' },
            { key: 'pending_payment', label: 'Pending Payment' },
            { key: 'confirmed', label: 'Confirmed' },
            { key: 'completed', label: 'Completed' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No {activeTab === 'all' ? '' : activeTab.replace('_', ' ')} orders
            </h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'all' 
                ? "You haven't placed any orders yet. Start shopping!"
                : `You don't have any ${activeTab.replace('_', ' ')} orders.`
              }
            </p>
            <Link
              to="/products"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
              >
                {/* Order Header */}
                <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.id.slice(0, 12).toUpperCase()}
                      </h3>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-sm text-gray-600">
                      Placed on {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(order.total)}
                    </p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Items:</h4>
                  <div className="space-y-2">
                    {order.items.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          • {item.productName} ({item.quantity}x)
                        </span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-sm text-gray-500">
                        + {order.items.length - 3} more items
                      </p>
                    )}
                  </div>
                </div>

                {/* Shipping & Payment Info */}
                <div className="grid md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Shipping To:</p>
                    <p className="text-sm font-medium text-gray-900">{order.shippingInfo.fullName}</p>
                    <p className="text-sm text-gray-700">{order.shippingInfo.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Payment Method:</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {order.paymentMethod === 'transfer' ? 'Transfer (QRIS)' : 'Cash on Pickup'}
                    </p>
                    {order.paymentProof && (
                      <p className="text-xs text-green-600 mt-1">✓ Payment proof uploaded</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <Link
                    to={`/orders/${order.id}/confirmation`}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition text-sm"
                  >
                    View Details
                  </Link>
                  
                  {order.status === 'completed' && (
                    <button
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition text-sm"
                    >
                      Reorder
                    </button>
                  )}

                  {order.status === 'payment_rejected' && (
                    <Link
                      to="/products"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition text-sm"
                    >
                      Shop Again
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
