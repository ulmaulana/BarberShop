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
  
  // Voucher
  const [voucherCode, setVoucherCode] = useState('')
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null)
  const [voucherLoading, setVoucherLoading] = useState(false)
  const [voucherError, setVoucherError] = useState('')

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
        showToast('Keranjang Anda kosong', 'error')
        navigate('/cart')
        return
      }

      setCartItems(items)

      // Pre-fill user data
      setFullName(user.displayName || '')
      // You can load more user data from Firestore if available
    } catch (error) {
      console.error('Error loading checkout data:', error)
      showToast('Gagal memuat data checkout', 'error')
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

  const calculateDiscount = () => {
    if (!appliedVoucher) return 0
    
    const subtotal = calculateSubtotal()
    
    if (appliedVoucher.discountType === 'percentage') {
      const discount = subtotal * (appliedVoucher.discountValue / 100)
      return appliedVoucher.maxDiscount 
        ? Math.min(discount, appliedVoucher.maxDiscount)
        : discount
    } else {
      return appliedVoucher.discountValue
    }
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const discount = calculateDiscount()
    const tax = calculateTax(subtotal - discount)
    return subtotal - discount + tax
  }

  const handlePaymentProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast('Ukuran file harus kurang dari 5MB', 'error')
        return
      }
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showToast('Silakan upload file gambar', 'error')
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

  const applyVoucher = async () => {
    if (!voucherCode.trim()) {
      setVoucherError('Please enter a voucher code')
      return
    }

    setVoucherLoading(true)
    setVoucherError('')

    try {
      // Query voucher by code
      const vouchersRef = collection(firestore, 'vouchers')
      const q = query(vouchersRef, where('code', '==', voucherCode.toUpperCase()))
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        setVoucherError('Invalid voucher code')
        return
      }

      const voucherDoc = snapshot.docs[0]
      const voucher = { id: voucherDoc.id, ...voucherDoc.data() } as Voucher

      // Validate voucher
      if (!voucher.isActive) {
        setVoucherError('This voucher is no longer active')
        return
      }

      if (new Date(voucher.expiryDate) < new Date()) {
        setVoucherError('This voucher has expired')
        return
      }

      const subtotal = calculateSubtotal()
      if (subtotal < voucher.minPurchase) {
        setVoucherError(`Minimum purchase of ${formatCurrency(voucher.minPurchase)} required`)
        return
      }

      if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
        setVoucherError('This voucher has reached its usage limit')
        return
      }

      setAppliedVoucher(voucher)
      showToast('Voucher berhasil diterapkan!', 'success')
    } catch (error) {
      console.error('Error applying voucher:', error)
      setVoucherError('Failed to apply voucher')
    } finally {
      setVoucherLoading(false)
    }
  }

  const removeVoucher = () => {
    setAppliedVoucher(null)
    setVoucherCode('')
    setVoucherError('')
    showToast('Voucher dihapus', 'info')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!fullName || !phone) {
      showToast('Silakan isi semua field yang wajib', 'error')
      return
    }

    // Address required only for delivery (not for pickup)
    if (paymentMethod === 'transfer' && !address) {
      showToast('Silakan isi alamat pengiriman', 'error')
      return
    }

    if (paymentMethod === 'transfer' && !paymentProof) {
      showToast('Silakan upload bukti pembayaran', 'error')
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
        discount: calculateDiscount(),
        voucherCode: appliedVoucher?.code || null,
        voucherId: appliedVoucher?.id || null,
        tax: calculateTax(calculateSubtotal() - calculateDiscount()),
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

      showToast('Pesanan berhasil dibuat!', 'success')
      navigate(`/orders/${orderRef.id}/confirmation`)
    } catch (error) {
      console.error('Error placing order:', error)
      showToast('Gagal membuat pesanan', 'error')
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
            <span>Progres:</span>
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
                  Informasi Pengiriman
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Lengkap *
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nama lengkap Anda"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nomor Telepon *
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

                  {paymentMethod === 'transfer' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alamat Pengiriman *
                      </label>
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required={paymentMethod === 'transfer'}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Jl. Merdeka No. 123&#10;Jakarta Pusat"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Metode Pembayaran *
                </h2>

                <div className="space-y-3 mb-6">
                  <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer hover:border-blue-500 transition ${
                    paymentMethod === 'cash' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="ml-3">
                      <span className="font-medium block">Ambil di Barber</span>
                      <span className="text-xs text-gray-600">Bayar langsung saat mengambil pesanan</span>
                    </div>
                  </label>

                  <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer hover:border-blue-500 transition ${
                    paymentMethod === 'transfer' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="transfer"
                      checked={paymentMethod === 'transfer'}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="ml-3">
                      <span className="font-medium block">Transfer (QRIS)</span>
                      <span className="text-xs text-gray-600">Bayar sekarang dengan transfer bank</span>
                    </div>
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
                            <p className="text-sm text-gray-600">Kode QR</p>
                            <p className="text-xs text-gray-500">Scan untuk bayar</p>
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
                        Upload Bukti Pembayaran *
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
                    Catatan (Opsional):
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Instruksi khusus untuk pesanan Anda..."
                  />
                </div>
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Ringkasan Pesanan
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

                {/* Voucher Section */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kode Voucher
                  </label>
                  {!appliedVoucher ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                        placeholder="Masukkan kode"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm uppercase"
                      />
                      <button
                        type="button"
                        onClick={applyVoucher}
                        disabled={voucherLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition text-sm disabled:opacity-50"
                      >
                        {voucherLoading ? '...' : 'Terapkan'}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-green-600 text-lg">🎟️</span>
                          <span className="font-semibold text-green-900">{appliedVoucher.code}</span>
                        </div>
                        <button
                          type="button"
                          onClick={removeVoucher}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Hapus
                        </button>
                      </div>
                      <p className="text-xs text-green-700">
                        {appliedVoucher.discountType === 'percentage' 
                          ? `Diskon ${appliedVoucher.discountValue}%` 
                          : `Diskon ${formatCurrency(appliedVoucher.discountValue)}`}
                        {appliedVoucher.maxDiscount && ` (maks ${formatCurrency(appliedVoucher.maxDiscount)})`}
                      </p>
                    </div>
                  )}
                  {voucherError && (
                    <p className="text-xs text-red-600 mt-1">{voucherError}</p>
                  )}
                </div>

                <hr className="my-4" />

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-medium">
                      {formatCurrency(calculateSubtotal())}
                    </span>
                  </div>
                  {appliedVoucher && (
                    <div className="flex justify-between text-green-600">
                      <span>Diskon:</span>
                      <span className="font-medium">
                        - {formatCurrency(calculateDiscount())}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-700">
                    <span>Pajak (11%):</span>
                    <span className="font-medium">
                      {formatCurrency(calculateTax(calculateSubtotal() - calculateDiscount()))}
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
                      Instruksi Pembayaran (Transfer QRIS)
                    </h3>
                    <div className="text-xs text-gray-700 space-y-1">
                      <p><strong>Bank:</strong> BCA</p>
                      <p><strong>Atas Nama:</strong> Sahala Barber</p>
                      <p><strong>Nomor Rekening:</strong> 1234567890</p>
                      <hr className="my-2" />
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Scan QR atau transfer ke rekening</li>
                        <li>Upload bukti transfer</li>
                        <li>Tunggu verifikasi admin</li>
                      </ol>
                    </div>
                  </div>
                )}

                {paymentMethod === 'cash' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                      Informasi Pengambilan
                    </h3>
                    <div className="text-xs text-gray-700 space-y-1">
                      <p><strong>Lokasi:</strong> Sahala Barber Shop</p>
                      <p><strong>Alamat:</strong> Jl. Contoh No. 123, Jakarta</p>
                      <p><strong>Jam Buka:</strong> 09:00 - 21:00</p>
                      <hr className="my-2" />
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Pesanan akan disiapkan dalam 1-2 hari</li>
                        <li>Anda akan dihubungi saat pesanan siap</li>
                        <li>Bayar saat mengambil pesanan</li>
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
                    ← Kembali
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {submitting ? 'Memproses...' : 'Buat Pesanan'}
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
