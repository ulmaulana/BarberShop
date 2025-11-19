import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { firestore } from '../../config/firebase'
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
  totalAmount: number
  discount?: number
  status: string
  createdAt: string
}

export function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderId) {
      loadOrder()
    }
  }, [orderId])

  const loadOrder = async () => {
    if (!orderId) return

    try {
      const orderDoc = await getDoc(doc(firestore, 'orders', orderId))
      if (orderDoc.exists()) {
        const orderData = {
          id: orderDoc.id,
          ...orderDoc.data()
        } as Order
        
        console.log('📦 Order loaded:', orderData)
        console.log('💰 Total Amount:', orderData.totalAmount)
        
        setOrder(orderData)
      }
    } catch (error) {
      console.error('Error loading order:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-6">The order you're looking for doesn't exist.</p>
          <Link
            to="/products"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <span className="text-5xl">✅</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Order Placed Successfully!
          </h1>
          <p className="text-xl text-gray-600">
            Thank you for your purchase, {order.shippingInfo.fullName}!
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Details</h2>

          {/* Order Info */}
          <div className="grid md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-200">
            <div>
              <p className="text-sm text-gray-600 mb-1">Order ID:</p>
              <p className="font-semibold text-gray-900">#{order.id.slice(0, 12).toUpperCase()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Date:</p>
              <p className="font-semibold text-gray-900">
                {new Date(order.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Status:</p>
              <div className="inline-flex items-center gap-2">
                {order.status === 'pending_payment' ? (
                  <>
                    <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                    <span className="font-semibold text-yellow-700">⏳ Pending Verification</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="font-semibold text-green-700">✓ Confirmed</span>
                  </>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Payment Method:</p>
              <p className="font-semibold text-gray-900 capitalize">
                {order.paymentMethod === 'transfer' ? 'Transfer (QRIS)' : 'Cash on Pickup'}
              </p>
            </div>
          </div>

          {/* Items Ordered */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Items Ordered:</h3>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      • {item.productName} ({item.quantity}x)
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Price Summary */}
          <div className="space-y-2 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal:</span>
              <span className="font-medium">{formatCurrency(order.subtotal || 0)}</span>
            </div>
            {order.discount && order.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span className="font-medium">-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-700">
              <span>Tax (PPN 11%):</span>
              <span className="font-medium">{formatCurrency(order.tax || 0)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-900 pt-2">
              <span>Total:</span>
              <span className="text-blue-600">{formatCurrency(order.totalAmount || 0)}</span>
            </div>
          </div>

          {/* Payment Proof Status */}
          {order.paymentMethod === 'transfer' && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-2xl">ℹ️</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Payment Verification</h4>
                  <p className="text-sm text-gray-700 mb-2">
                    Your payment proof has been uploaded and is being verified by our admin team.
                    You will receive a notification once your payment is confirmed.
                  </p>
                  {order.paymentProof && (
                    <p className="text-xs text-green-600">✓ Payment Proof: Uploaded</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Shipping Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3">Shipping Information</h4>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-600">Name:</span> <span className="font-medium">{order.shippingInfo.fullName}</span></p>
              <p><span className="text-gray-600">Phone:</span> <span className="font-medium">{order.shippingInfo.phone}</span></p>
              <p><span className="text-gray-600">Address:</span> <span className="font-medium">{order.shippingInfo.address}</span></p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/orders"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition shadow-md text-center"
          >
            View My Orders
          </Link>
          <Link
            to="/products"
            className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition text-center"
          >
            Continue Shopping
          </Link>
        </div>

        {/* Next Steps Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Questions about your order? <Link to="/contact" className="text-blue-600 hover:text-blue-700 font-medium">Contact us</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
