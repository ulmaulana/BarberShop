import { useState, useEffect } from 'react'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { FirebaseService } from '../../services/firebase.service'
import { CloudinaryService } from '../../services/cloudinary.service'
import { formatCurrency } from '../../utils/format'
import { formatDateTime } from '../../utils/date'
import { handleError } from '../../utils/error'
import type { Order } from '../../types'

const ordersService = new FirebaseService('orders')

export function OrdersListPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (user) {
      loadOrders()
    }
  }, [user])

  const loadOrders = async () => {
    if (!user) return
    
    try {
      const constraints = FirebaseService.where('customerId', '==', user.uid)
      const data = await ordersService.query([constraints, FirebaseService.orderBy('createdAt', 'desc')])
      setOrders(data as Order[])
    } catch (error) {
      showToast(handleError(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadProof = async (file: File) => {
    if (!selectedOrder) return
    
    setUploading(true)
    try {
      const result = await CloudinaryService.uploadImage(file, 'payment_proofs')
      await ordersService.update(selectedOrder.id, {
        paymentProofUrl: result.url,
        status: 'pending_verification',
      })
      
      showToast('Bukti pembayaran berhasil diunggah!', 'success')
      setUploadModalOpen(false)
      setSelectedOrder(null)
      await loadOrders()
    } catch (error) {
      showToast(handleError(error), 'error')
    } finally {
      setUploading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending_payment: 'bg-yellow-100 text-yellow-800',
      pending_verification: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      ready_for_pickup: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      payment_rejected: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending_payment: 'Menunggu Pembayaran',
      pending_verification: 'Verifikasi Pembayaran',
      processing: 'Diproses',
      ready_for_pickup: 'Siap Diambil',
      completed: 'Selesai',
      payment_rejected: 'Pembayaran Ditolak',
    }
    return labels[status] || status
  }

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pesanan Saya</h1>
        <p className="mt-2 text-gray-600">Riwayat pesanan produk Anda</p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-600">
            Anda belum memiliki pesanan.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.id.slice(0, 8)}
                      </h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            {item.name} x {item.quantity}
                          </span>
                          <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t pt-4">
                      <span className="font-medium text-gray-900">Total:</span>
                      <span className="text-xl font-bold text-blue-600">
                        {formatCurrency(order.total)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-gray-600">
                      Metode: <span className="uppercase">{order.paymentMethod}</span> | 
                      Dibuat: {formatDateTime(order.createdAt)}
                    </p>
                  </div>

                  <div className="ml-4">
                    {order.status === 'pending_payment' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order)
                          setUploadModalOpen(true)
                        }}
                      >
                        Upload Bukti
                      </Button>
                    )}
                    {order.status === 'ready_for_pickup' && (
                      <Button size="sm" variant="secondary">
                        Ambil Pesanan
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false)
          setSelectedOrder(null)
        }}
        title="Upload Bukti Pembayaran"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload screenshot/foto bukti transfer pembayaran Anda.
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUploadProof(file)
            }}
            disabled={uploading}
            className="block w-full text-sm text-gray-600"
          />
          {uploading && <LoadingSpinner size="sm" />}
        </div>
      </Modal>
    </div>
  )
}
