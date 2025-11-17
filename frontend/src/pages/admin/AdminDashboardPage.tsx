import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { firestore } from '../../config/firebase'

interface Stats {
  totalRevenue: number
  netProfit: number
  pendingPayments: number
  avgTransaction: number
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    netProfit: 0,
    pendingPayments: 0,
    avgTransaction: 0,
  })
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadStats()
  }, [])
  
  const loadStats = async () => {
    try {
      // Load real stats dari Firestore
      // Sementara mock data
      setStats({
        totalRevenue: 15750000,
        netProfit: 8500000,
        pendingPayments: 12,
        avgTransaction: 125000,
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, Admin</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-800">
                Rp {stats.totalRevenue.toLocaleString('id-ID')}
              </p>
              <p className="text-sm text-green-600 mt-2">+12.5% ↗</p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>
        
        {/* Net Profit */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Net Profit</p>
              <p className="text-2xl font-bold text-gray-800">
                Rp {stats.netProfit.toLocaleString('id-ID')}
              </p>
              <p className="text-sm text-gray-500 mt-2">54% margin</p>
            </div>
            <div className="text-4xl">📈</div>
          </div>
        </div>
        
        {/* Pending Payments */}
        <Link to="/adminpanel/payments">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Pending Payments</p>
                <p className="text-2xl font-bold text-gray-800">
                  {stats.pendingPayments} orders
                </p>
                <p className="text-sm text-blue-600 mt-2">Click to verify →</p>
              </div>
              <div className="text-4xl">⏳</div>
            </div>
          </div>
        </Link>
        
        {/* Avg Transaction */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Avg Transaction</p>
              <p className="text-2xl font-bold text-gray-800">
                Rp {stats.avgTransaction.toLocaleString('id-ID')}
              </p>
              <p className="text-sm text-green-600 mt-2">↑ +8.5%</p>
            </div>
            <div className="text-4xl">🎯</div>
          </div>
        </div>
      </div>
      
      {/* Revenue Chart Placeholder */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Revenue Trend (Last 30 Days)
        </h2>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
          <p className="text-gray-400">Chart will be implemented with Recharts</p>
        </div>
      </div>
      
      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            🏆 Top Products
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-800">Pomade Strong</p>
                <p className="text-sm text-gray-500">35 sold</p>
              </div>
              <p className="font-semibold text-gray-800">Rp 2.5M</p>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-800">Shampoo AK</p>
                <p className="text-sm text-gray-500">45 sold</p>
              </div>
              <p className="font-semibold text-gray-800">Rp 1.8M</p>
            </div>
          </div>
          <Link
            to="/adminpanel/products"
            className="block text-center text-sm text-blue-600 hover:text-blue-700 mt-4"
          >
            View All →
          </Link>
        </div>
        
        {/* Top Services */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            ✂️ Top Services
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-800">Haircut Premium</p>
                <p className="text-sm text-gray-500">90 bookings</p>
              </div>
              <p className="font-semibold text-gray-800">Rp 4.5M</p>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-800">Styling & Wash</p>
                <p className="text-sm text-gray-500">70 bookings</p>
              </div>
              <p className="font-semibold text-gray-800">Rp 2.8M</p>
            </div>
          </div>
          <Link
            to="/adminpanel/services"
            className="block text-center text-sm text-blue-600 hover:text-blue-700 mt-4"
          >
            View All →
          </Link>
        </div>
        
        {/* Top Barbers */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            💈 Top Barbers
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-800">John Doe</p>
                <p className="text-sm text-gray-500">4.8⭐ (65 appts)</p>
              </div>
              <p className="font-semibold text-gray-800">Rp 5.2M</p>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-800">Jane Smith</p>
                <p className="text-sm text-gray-500">4.9⭐ (60 appts)</p>
              </div>
              <p className="font-semibold text-gray-800">Rp 4.8M</p>
            </div>
          </div>
          <Link
            to="/adminpanel/barbers"
            className="block text-center text-sm text-blue-600 hover:text-blue-700 mt-4"
          >
            View All →
          </Link>
        </div>
      </div>
    </div>
  )
}
