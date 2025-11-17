import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { useToast } from '../../contexts/ToastContext'
import { FirebaseService } from '../../services/firebase.service'
import { formatCurrency, formatNumber } from '../../utils/format'
import { handleError } from '../../utils/error'
import type { Appointment, Order, Transaction } from '../../types'

const appointmentsService = new FirebaseService('appointments')
const ordersService = new FirebaseService('orders')
const transactionsService = new FirebaseService('transactions')

export function OwnerDashboardPage() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalAppointments: 0,
    completedAppointments: 0,
    totalOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const [appointmentsData, ordersData, transactionsData] = await Promise.all([
        appointmentsService.getAll(),
        ordersService.getAll(),
        transactionsService.getAll(),
      ])

      const appointments = appointmentsData as Appointment[]
      const orders = ordersData as Order[]
      const transactions = transactionsData as Transaction[]

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0)
      const monthlyRevenue = transactions
        .filter(t => new Date(t.createdAt) >= startOfMonth)
        .reduce((sum, t) => sum + t.amount, 0)

      setStats({
        totalAppointments: appointments.length,
        completedAppointments: appointments.filter(a => a.status === 'completed').length,
        totalOrders: orders.length,
        completedOrders: orders.filter(o => o.status === 'completed').length,
        totalRevenue,
        monthlyRevenue,
      })
    } catch (error) {
      showToast(handleError(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Owner</h1>
        <p className="mt-2 text-gray-600">Ringkasan performa bisnis Anda</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-600">Total Appointment</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {formatNumber(stats.totalAppointments)}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {stats.completedAppointments} selesai
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-600">Total Pesanan</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {formatNumber(stats.totalOrders)}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {stats.completedOrders} selesai
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-600">Pendapatan Bulan Ini</h3>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {formatCurrency(stats.monthlyRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-600">Total Pendapatan</h3>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {formatCurrency(stats.totalRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-600">Conversion Rate</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {stats.totalAppointments > 0
                ? ((stats.completedAppointments / stats.totalAppointments) * 100).toFixed(1)
                : 0}
              %
            </p>
            <p className="mt-1 text-sm text-gray-600">Appointment → Selesai</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-gray-600">Average Order Value</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {stats.completedOrders > 0
                ? formatCurrency(stats.totalRevenue / stats.completedOrders)
                : formatCurrency(0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Appointment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Selesai</span>
                <span className="font-medium">{stats.completedAppointments}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Pending/Confirmed</span>
                <span className="font-medium">
                  {stats.totalAppointments - stats.completedAppointments}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-medium text-gray-900">Total</span>
                <span className="font-bold">{stats.totalAppointments}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Pesanan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Selesai</span>
                <span className="font-medium">{stats.completedOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Dalam Proses</span>
                <span className="font-medium">
                  {stats.totalOrders - stats.completedOrders}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-medium text-gray-900">Total</span>
                <span className="font-bold">{stats.totalOrders}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <a
              href="/barbers"
              className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-blue-500 hover:bg-blue-50"
            >
              <span className="text-3xl">💈</span>
              <p className="mt-2 font-medium text-gray-900">Kelola Barber</p>
            </a>
            <a
              href="/services"
              className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-blue-500 hover:bg-blue-50"
            >
              <span className="text-3xl">✂️</span>
              <p className="mt-2 font-medium text-gray-900">Kelola Layanan</p>
            </a>
            <a
              href="/products"
              className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-blue-500 hover:bg-blue-50"
            >
              <span className="text-3xl">📦</span>
              <p className="mt-2 font-medium text-gray-900">Kelola Produk</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
