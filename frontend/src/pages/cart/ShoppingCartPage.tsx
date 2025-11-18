import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { firestore } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { formatCurrency } from '../../utils/format'

interface CartItem {
  id: string
  userId: string
  productId: string
  quantity: number
  addedAt: string
  // Populated data
  productName?: string
  productPrice?: number
  productImage?: string
  productStock?: number
}

export function ShoppingCartPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadCart()
    } else {
      navigate('/login?redirect=/cart')
    }
  }, [user])

  const loadCart = async () => {
    if (!user) return

    try {
      setLoading(true)
      const cartRef = collection(firestore, 'cart')
      const q = query(cartRef, where('userId', '==', user.uid))
      const snapshot = await getDocs(q)
      
      const items = await Promise.all(
        snapshot.docs.map(async (cartDoc) => {
          const data = cartDoc.data()
          
          // Populate product data
          let productData = null
          if (data.productId) {
            const productDoc = await getDoc(doc(firestore, 'products', data.productId))
            if (productDoc.exists()) {
              productData = productDoc.data()
            }
          }
          
          return {
            id: cartDoc.id,
            ...data,
            productName: productData?.name,
            productPrice: productData?.price,
            productImage: productData?.images?.[0],
            productStock: productData?.stock,
          } as CartItem
        })
      )

      setCartItems(items)
    } catch (error) {
      console.error('Error loading cart:', error)
      showToast('Gagal memperbarui keranjang', 'error')
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (itemId: string, newQuantity: number, maxStock: number) => {
    if (newQuantity < 1) return
    if (newQuantity > maxStock) {
      showToast(`Hanya ${maxStock} item tersedia di stok`, 'error')
      return
    }

    try {
      setUpdating(itemId)
      await updateDoc(doc(firestore, 'cart', itemId), {
        quantity: newQuantity
      })
      setCartItems(items =>
        items.map(item =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      )
    } catch (error) {
      showToast('Gagal memperbarui kuantitas', 'error')
    } finally {
      setUpdating(null)
    }
  }

  const removeItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(firestore, 'cart', itemId))
      setCartItems(items => items.filter(item => item.id !== itemId))
      showToast('Item berhasil dihapus dari keranjang', 'success')
    } catch (error) {
      showToast('Gagal menghapus item', 'error')
    }
  }

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.productPrice || 0) * item.quantity
    }, 0)
  }

  const calculateTax = (subtotal: number) => {
    return subtotal * 0.11 // PPN 11%
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const tax = calculateTax(subtotal)
    return subtotal + tax
  }

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      showToast('Keranjang Anda kosong', 'error')
      return
    }
    navigate('/checkout')
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shopping Cart</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>
          <Link
            to="/products"
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 text-sm sm:text-base"
          >
            ← Continue Shopping
          </Link>
        </div>

        {cartItems.length === 0 ? (
          /* Empty Cart */
          <div className="bg-white rounded-lg shadow-sm p-8 sm:p-12 text-center">
            <div className="text-5xl sm:text-6xl mb-4">🛒</div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              Your cart is empty
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              Add some products to get started!
            </p>
            <Link
              to="/products"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition text-sm sm:text-base"
            >
              Shop Products
            </Link>
          </div>
        ) : (
          /* Cart Items */
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Items List */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition"
                >
                  <div className="flex gap-3 sm:gap-4">
                    {/* Product Image */}
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/150x150?text=No+Image'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl sm:text-4xl">
                          📦
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-1 truncate">
                        {item.productName}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                        Hair care product
                      </p>

                      {/* Price & Quantity Controls */}
                      <div className="flex flex-col gap-3">
                        {/* Mobile: Price and Remove on top */}
                        <div className="flex items-center justify-between sm:hidden">
                          <span className="text-base font-semibold text-blue-600">
                            {formatCurrency(item.productPrice || 0)}
                          </span>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-700 font-medium text-xs transition"
                          >
                            ✕ Hapus
                          </button>
                        </div>

                        {/* Quantity and Total */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 sm:gap-4">
                            {/* Desktop: Show price */}
                            <span className="hidden sm:inline text-lg font-semibold text-blue-600">
                              {formatCurrency(item.productPrice || 0)}
                            </span>
                            <span className="hidden sm:inline text-sm text-gray-600">x</span>
                            
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-1 sm:gap-2 border border-gray-300 rounded-lg">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1, item.productStock || 999)}
                                disabled={item.quantity <= 1 || updating === item.id}
                                className="px-2 sm:px-3 py-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm sm:text-base"
                              >
                                −
                              </button>
                              <span className="w-8 sm:w-12 text-center font-medium text-sm sm:text-base">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1, item.productStock || 999)}
                                disabled={item.quantity >= (item.productStock || 999) || updating === item.id}
                                className="px-2 sm:px-3 py-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm sm:text-base"
                              >
                                +
                              </button>
                            </div>

                            <span className="text-xs sm:text-sm text-gray-600">=</span>
                            <span className="text-sm sm:text-lg font-bold text-gray-900">
                              {formatCurrency((item.productPrice || 0) * item.quantity)}
                            </span>
                          </div>

                          {/* Desktop: Remove Button */}
                          <button
                            onClick={() => removeItem(item.id)}
                            className="hidden sm:block text-red-600 hover:text-red-700 font-medium text-sm transition"
                          >
                            ✕ Remove
                          </button>
                        </div>
                      </div>

                      {/* Stock Warning */}
                      {item.productStock && item.quantity >= item.productStock && (
                        <p className="text-xs text-yellow-600 mt-2">
                          Maximum stock reached
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 lg:sticky lg:top-8">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                  Order Summary
                </h3>

                <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                  <div className="flex justify-between text-gray-700 text-sm sm:text-base">
                    <span>Subtotal ({cartItems.length} items):</span>
                    <span className="font-medium">
                      {formatCurrency(calculateSubtotal())}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-700 text-sm sm:text-base">
                    <span>Tax (PPN 11%):</span>
                    <span className="font-medium">
                      {formatCurrency(calculateTax(calculateSubtotal()))}
                    </span>
                  </div>
                  <hr className="my-2 sm:my-3" />
                  <div className="flex justify-between text-base sm:text-lg font-bold text-gray-900">
                    <span>Total:</span>
                    <span className="text-blue-600">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  className="w-full py-3 sm:py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition shadow-md hover:shadow-lg text-base sm:text-lg"
                >
                  Proceed to Checkout →
                </button>

                <Link
                  to="/products"
                  className="block w-full mt-3 py-2 sm:py-3 text-center border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition text-sm sm:text-base"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
