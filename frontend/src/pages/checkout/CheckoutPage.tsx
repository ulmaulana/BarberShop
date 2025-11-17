import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, doc, getDoc, addDoc, writeBatch } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { firestore, firebaseStorage } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { formatCurrency } from '../../utils/format'

interface CartItem {
  id: string
  productId: string
  quantity: number
  productName?: string
  productPrice?: number
}

type PaymentMethod = 'cash' | 'transfer'

export function CheckoutPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form fields
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer')
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/checkout')
      return
    }
    loadCartAndUserData()
  }, [user])

  const loadCartAndUserData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Load cart items
      const cartRef = collection(firestore, 'cart')
      const q = query(cartRef, where('userId', '==', user.uid))
      const snapshot = await getDocs(q)
      
      const items = await Promise.all(
        snapshot.docs.map(async (cartDoc) => {
          const data = cartDoc.data()
          const productDoc = await getDoc(doc(firestore, 'products', data.productId))
          const productData = productDoc.data()
          
          return {
            id: cartDoc.id,
            productId: data.productId,
            quantity: data.quantity,
            productName: productData?.name,
            productPrice: productData?.price,
          } as CartItem
        })
      )

      if (items.length === 0) {
        showToast('Your cart is empty', 'error')
        navigate('/cart')
        return
      }

      setCartItems(items)

      // Pre-fill user data
      setFullName(user.displayName || '')
      // You can load more user data from Firestore if available
    } catch (error) {
      console.error('Error loading checkout data:', error)
      showToast('Failed to load checkout data', 'error')
    } finally {
      setLoading(false)
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

  const handlePaymentProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be less than 5MB', 'error')
        return
      }
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file', 'error')
        return
      }
      setPaymentProof(file)
    }
  }

  const uploadPaymentProof = async (file: File): Promise<string> => {
    const timestamp = Date.now()
    const fileName = `payment-proofs/${user!.uid}/${timestamp}-${file.name}`
    const storageRef = ref(firebaseStorage, fileName)
    
    await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(storageRef)
    
    return downloadURL
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!fullName || !phone || !address) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    if (paymentMethod === 'transfer' && !paymentProof) {
      showToast('Please upload payment proof', 'error')
      return
    }

    if (!user) return

    setSubmitting(true)

    try {
      let paymentProofUrl = ''
      
      // Upload payment proof if transfer method
      if (paymentMethod === 'transfer' && paymentProof) {
        paymentProofUrl = await uploadPaymentProof(paymentProof)
      }

      // Create order
      const orderData = {
        userId: user.uid,
        items: cartItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.productPrice,
        })),
        shippingInfo: {
          fullName,
          phone,
          address,
        },
        paymentMethod,
        paymentProof: paymentProofUrl,
        notes,
        subtotal: calculateSubtotal(),
        tax: calculateTax(calculateSubtotal()),
        total: calculateTotal(),
        status: paymentMethod === 'transfer' ? 'pending_payment' : 'confirmed',
        createdAt: new Date().toISOString(),
      }

      const orderRef = await addDoc(collection(firestore, 'orders'), orderData)

      // Clear cart using batch
      const batch = writeBatch(firestore)
      cartItems.forEach(item => {
        batch.delete(doc(firestore, 'cart', item.id))
      })
      await batch.commit()

      showToast('Order placed successfully!', 'success')
      navigate(`/orders/${orderRef.id}/confirmation`)
    } catch (error) {
      console.error('Error placing order:', error)
      showToast('Failed to place order', 'error')
    } finally {
      setSubmitting(false)
    }
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
        {/* Header with Progress */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Progress:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`w-8 h-2 rounded-full ${step <= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}
                />
              ))}
            </div>
            <span className="font-semibold">3/4</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Shipping & Payment Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Information */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Shipping Information
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="08123456789"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address *
                    </label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Jl. Merdeka No. 123&#10;Jakarta Pusat"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Payment Method *
                </h2>

                <div className="space-y-3 mb-6">
                  <label className="flex items-center p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-3 font-medium">Cash on Pickup</span>
                  </label>

                  <label className="flex items-center p-4 border-2 border-blue-600 rounded-lg cursor-pointer bg-blue-50">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="transfer"
                      checked={paymentMethod === 'transfer'}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-3 font-medium">Transfer (QRIS)</span>
                  </label>
                </div>

                {/* QRIS Payment Info */}
                {paymentMethod === 'transfer' && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-center mb-4">
                        <div className="w-48 h-48 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-6xl mb-2">📱</div>
                            <p className="text-sm text-gray-600">QR Code</p>
                            <p className="text-xs text-gray-500">Scan to pay</p>
                            <p className="text-lg font-bold text-blue-600 mt-2">
                              {formatCurrency(calculateTotal())}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Upload Payment Proof */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Payment Proof *
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePaymentProofChange}
                        required={paymentMethod === 'transfer'}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {paymentProof && (
                        <p className="text-sm text-green-600 mt-2">
                          ✓ {paymentProof.name}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional):
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any special instructions..."
                  />
                </div>
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Order Summary
                </h2>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-3">
                    {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          - {item.productName} ({item.quantity}x)
                        </span>
                        <span className="font-medium">
                          {formatCurrency((item.productPrice || 0) * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <hr className="my-4" />

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-medium">
                      {formatCurrency(calculateSubtotal())}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Tax (11%):</span>
                    <span className="font-medium">
                      {formatCurrency(calculateTax(calculateSubtotal()))}
                    </span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>Total:</span>
                    <span className="text-blue-600">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                </div>

                {/* Payment Instructions */}
                {paymentMethod === 'transfer' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                      Payment Instructions (Transfer QRIS)
                    </h3>
                    <div className="text-xs text-gray-700 space-y-1">
                      <p><strong>Bank:</strong> BCA</p>
                      <p><strong>Account:</strong> Sahala Barber</p>
                      <p><strong>Number:</strong> 1234567890</p>
                      <hr className="my-2" />
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Scan QR atau transfer ke rekening</li>
                        <li>Upload bukti transfer</li>
                        <li>Tunggu verifikasi admin</li>
                      </ol>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/cart')}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                  >
                    ← Back to Cart
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {submitting ? 'Processing...' : 'Place Order'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
