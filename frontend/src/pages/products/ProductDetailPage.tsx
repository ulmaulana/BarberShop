import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { FirebaseService } from '../../services/firebase.service'
import { formatCurrency } from '../../utils/format'
import { handleError } from '../../utils/error'
import type { Product } from '../../types'

const productsService = new FirebaseService('products')
const ordersService = new FirebaseService('orders')

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  
  const [product, setProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [ordering, setOrdering] = useState(false)

  useEffect(() => {
    if (id) {
      loadProduct()
    }
  }, [id])

  const loadProduct = async () => {
    if (!id) return
    
    try {
      const data = await productsService.getById(id)
      setProduct(data as Product)
    } catch (error) {
      showToast(handleError(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleOrder = async () => {
    if (!user || !product) return
    
    setOrdering(true)
    try {
      await ordersService.create({
        customerId: user.uid,
        items: [{
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity,
        }],
        total: product.price * quantity,
        paymentMethod: 'qris',
        status: 'pending_payment',
      })
      
      showToast('Pesanan berhasil dibuat! Silakan lakukan pembayaran.', 'success')
      navigate('/orders')
    } catch (error) {
      showToast(handleError(error), 'error')
    } finally {
      setOrdering(false)
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />
  }

  if (!product) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">Produk tidak ditemukan.</p>
        <Button onClick={() => navigate('/products')} className="mt-4">
          Kembali ke Produk
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        ← Kembali
      </Button>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-lg bg-gray-200">
            {product.images && product.images.length > 0 ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/800x800?text=No+Image'
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                <span className="text-9xl">📦</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <p className="mt-2 text-sm capitalize text-gray-600">{product.category}</p>
          </div>

          <div className="text-3xl font-bold text-blue-600">
            {formatCurrency(product.price)}
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">Deskripsi</h3>
            <p className="mt-2 text-gray-600">{product.description}</p>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-medium text-gray-900">Stok:</span>
            <span className={product.stock < product.lowStockThreshold ? 'text-yellow-600' : 'text-gray-600'}>
              {product.stock} unit
              {product.stock < product.lowStockThreshold && product.stock > 0 && ' (Stok Terbatas)'}
            </span>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Jumlah</label>
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      -
                    </Button>
                    <span className="w-12 text-center font-medium">{quantity}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      disabled={quantity >= product.stock}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <span className="font-medium text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatCurrency(product.price * quantity)}
                  </span>
                </div>

                <Button
                  onClick={handleOrder}
                  className="w-full"
                  disabled={product.stock === 0}
                  isLoading={ordering}
                >
                  {product.stock === 0 ? 'Stok Habis' : 'Pesan Sekarang'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
