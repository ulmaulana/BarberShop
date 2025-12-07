import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore'
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
  productImage?: string
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
  total?: number
  totalAmount?: number
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

  // GUARD: Redirect admin to admin panel
  useEffect(() => {
    if (user && user.role === 'admin') {
      console.warn('🚨 ADMIN in MyOrdersPage - REDIRECTING')
      showToast('Admin harus menggunakan Panel Admin!', 'error')
      navigate('/adminpanel/dashboard', { replace: true })
      return
    }
    
    if (!user) {
      navigate('/login?redirect=/orders')
      return
    }
    
    loadOrders()
  }, [user, navigate, showToast])

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
      
      // Load orders with product images
      const ordersData = await Promise.all(
        snapshot.docs.map(async (orderDoc) => {
          const orderData = orderDoc.data()
          
          // Fetch product images for each item
          const itemsWithImages = await Promise.all(
            orderData.items.map(async (item: OrderItem) => {
              try {
                const productDoc = await getDoc(doc(firestore, 'products', item.productId))
                if (productDoc.exists()) {
                  const productData = productDoc.data()
                  return {
                    ...item,
                    productImage: productData.images?.[0] || null
                  }
                }
              } catch (error) {
                console.error(`Error loading product ${item.productId}:`, error)
              }
              return item
            })
          )
          
          return {
            id: orderDoc.id,
            ...orderData,
            items: itemsWithImages
          } as Order
        })
      )

      setOrders(ordersData)
    } catch (error) {
      console.error('Error loading orders:', error)
      showToast('Gagal memuat pesanan', 'error')
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
      pending_payment: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Menunggu Pembayaran' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Dikonfirmasi' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Selesai' },
      payment_rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Pembayaran Ditolak' },
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
    return date.toLocaleDateString('id-ID', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Pesanan Saya</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Lacak dan kelola pesanan produk Anda</p>
          </div>
          <Link
            to="/products"
            className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-sm text-center text-sm sm:text-base whitespace-nowrap"
          >
            Belanja Produk
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 sm:gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
          {[
            { key: 'all', label: 'Semua Pesanan' },
            { key: 'pending_payment', label: 'Menunggu' },
            { key: 'confirmed', label: 'Dikonfirmasi' },
            { key: 'completed', label: 'Selesai' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`px-3 sm:px-6 py-2 sm:py-3 font-medium transition-colors border-b-2 whitespace-nowrap text-sm sm:text-base ${
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
              {activeTab === 'all' ? 'Tidak ada pesanan' : `Tidak ada pesanan ${activeTab === 'pending_payment' ? 'menunggu' : activeTab === 'confirmed' ? 'dikonfirmasi' : 'selesai'}`}
            </h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'all' 
                ? "Anda belum pernah melakukan pemesanan. Mulai belanja sekarang!"
                : `Anda tidak memiliki pesanan ${activeTab === 'pending_payment' ? 'yang menunggu pembayaran' : activeTab === 'confirmed' ? 'yang dikonfirmasi' : 'yang selesai'}.`
              }
            </p>
            <Link
              to="/products"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
            >
              Jelajahi Produk
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6"
              >
                {/* Order Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4 pb-4 border-b border-gray-200">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                        Order #{order.id.slice(0, 8).toUpperCase()}
                      </h3>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Dipesan pada {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Pembayaran</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">
                      {formatCurrency(order.totalAmount ?? order.total ?? 0)}
                    </p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-4">
                  <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-3">Produk:</h4>
                  <div className="space-y-3">
                    {order.items.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex items-center gap-2 sm:gap-3">
                        {/* Product Image */}
                        <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                          {item.productImage ? (
                            <img
                              src={item.productImage}
                              alt={item.productName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/64x64?text=No+Image'
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] sm:text-xs">
                              Tanpa Gambar
                            </div>
                          )}
                        </div>
                        
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                            {item.productName}
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-600">
                            Qty: {item.quantity} × {formatCurrency(item.price)}
                          </p>
                        </div>
                        
                        {/* Price */}
                        <div className="text-xs sm:text-sm font-semibold text-gray-900">
                          {formatCurrency(item.price * item.quantity)}
                        </div>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-xs sm:text-sm text-gray-500 pl-14 sm:pl-20">
                        + {order.items.length - 3} produk lainnya
                      </p>
                    )}
                  </div>
                </div>

                {/* Shipping & Payment Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Dikirim Ke:</p>
                    <p className="text-xs sm:text-sm font-medium text-gray-900">{order.shippingInfo.fullName}</p>
                    <p className="text-xs sm:text-sm text-gray-700">{order.shippingInfo.phone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Metode Pembayaran:</p>
                    <p className="text-xs sm:text-sm font-medium text-gray-900 capitalize">
                      {order.paymentMethod === 'transfer' ? 'Transfer (QRIS)' : 'Ambil di Barber'}
                    </p>
                    {order.paymentProof && (
                      <p className="text-[10px] sm:text-xs text-green-600 mt-1">✓ Bukti pembayaran telah diupload</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-200">
                  <Link
                    to={`/orders/${order.id}/confirmation`}
                    className="px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition text-xs sm:text-sm text-center"
                  >
                    Lihat Detail
                  </Link>
                  
                  {order.status === 'completed' && (
                    <button
                      className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition text-xs sm:text-sm"
                    >
                      Pesan Lagi
                    </button>
                  )}

                  {order.status === 'payment_rejected' && (
                    <Link
                      to="/products"
                      className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition text-xs sm:text-sm text-center"
                    >
                      Belanja Lagi
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
