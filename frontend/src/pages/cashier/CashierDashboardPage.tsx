import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../contexts/ToastContext'
import { FirebaseService } from '../../services/firebase.service'
import { formatCurrency } from '../../utils/format'
import { formatDateTime } from '../../utils/date'
import { handleError } from '../../utils/error'
import type { Order } from '../../types'

const ordersService = new FirebaseService('orders')

export function CashierDashboardPage() {
  const { showToast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      const constraints = [
        FirebaseService.where('status', 'in', ['pending_verification', 'processing', 'ready_for_pickup']),
        FirebaseService.orderBy('createdAt', 'desc'),
      ]
      const data = await ordersService.query(constraints)
      setOrders(data as Order[])
    } catch (error) {
      showToast(handleError(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyPayment = async (orderId: string, approved: boolean) => {
    try {
      const newStatus = approved ? 'processing' : 'payment_rejected'
      await ordersService.update(orderId, { status: newStatus })
      showToast(approved ? 'Pembayaran diverifikasi' : 'Pembayaran ditolak', approved ? 'success' : 'warning')
      setVerifyModalOpen(false)
      setSelectedOrder(null)
      await loadOrders()
    } catch (error) {
      showToast(handleError(error), 'error')
    }
  }

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      await ordersService.update(orderId, { status })
      showToast('Status order berhasil diupdate', 'success')
      await loadOrders()
    } catch (error) {
      showToast(handleError(error), 'error')
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />
  }

  const pendingVerification = orders.filter(o => o.status === 'pending_verification')
  const processing = orders.filter(o => o.status === 'processing')
  const readyForPickup = orders.filter(o => o.status === 'ready_for_pickup')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Kasir</h1>
        <p className="mt-2 text-gray-600">Kelola pesanan dan verifikasi pembayaran</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-600">Perlu Verifikasi</h3>
            <p className="mt-2 text-3xl font-bold text-yellow-600">{pendingVerification.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-600">Sedang Diproses</h3>
            <p className="mt-2 text-3xl font-bold text-blue-600">{processing.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-600">Siap Diambil</h3>
            <p className="mt-2 text-3xl font-bold text-green-600">{readyForPickup.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pesanan Perlu Verifikasi Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingVerification.length === 0 ? (
            <p className="py-8 text-center text-gray-600">Tidak ada pesanan yang perlu diverifikasi.</p>
          ) : (
            <div className="space-y-4">
              {pendingVerification.map((order) => (
                <div key={order.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Order #{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-gray-600">Total: {formatCurrency(order.totalAmount ?? order.total ?? 0)}</p>
                    <p className="text-sm text-gray-600">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedOrder(order)
                      setVerifyModalOpen(true)
                    }}
                  >
                    Verifikasi
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pesanan Diproses</CardTitle>
        </CardHeader>
        <CardContent>
          {processing.length === 0 ? (
            <p className="py-8 text-center text-gray-600">Tidak ada pesanan dalam proses.</p>
          ) : (
            <div className="space-y-4">
              {processing.map((order) => (
                <div key={order.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">Order #{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-gray-600">Total: {formatCurrency(order.totalAmount ?? order.total ?? 0)}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus(order.id, 'ready_for_pickup')}
                  >
                    Siap Diambil
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pesanan Siap Diambil</CardTitle>
        </CardHeader>
        <CardContent>
          {readyForPickup.length === 0 ? (
            <p className="py-8 text-center text-gray-600">Tidak ada pesanan siap diambil.</p>
          ) : (
            <div className="space-y-4">
              {readyForPickup.map((order) => (
                <div key={order.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">Order #{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-gray-600">Total: {formatCurrency(order.totalAmount ?? order.total ?? 0)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleUpdateStatus(order.id, 'completed')}
                  >
                    Selesai
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={verifyModalOpen}
        onClose={() => {
          setVerifyModalOpen(false)
          setSelectedOrder(null)
        }}
        title="Verifikasi Pembayaran"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Order ID:</p>
              <p className="font-medium">#{selectedOrder.id.slice(0, 8)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total:</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(selectedOrder.totalAmount ?? selectedOrder.total ?? 0)}</p>
            </div>
            {selectedOrder.paymentProofUrl && (
              <div>
                <p className="mb-2 text-sm text-gray-600">Bukti Pembayaran:</p>
                <img
                  src={selectedOrder.paymentProofUrl}
                  alt="Payment Proof"
                  className="w-full rounded-lg border"
                />
              </div>
            )}
            <div className="flex gap-3">
              <Button
                variant="danger"
                onClick={() => handleVerifyPayment(selectedOrder.id, false)}
                className="flex-1"
              >
                Tolak
              </Button>
              <Button
                onClick={() => handleVerifyPayment(selectedOrder.id, true)}
                className="flex-1"
              >
                Setujui
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
