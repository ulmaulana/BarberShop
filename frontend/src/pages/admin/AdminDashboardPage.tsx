import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { adminFirestore } from '../../config/firebaseAdmin'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Stats {
  totalRevenue: number
  netProfit: number
  pendingPayments: number
  avgTransaction: number
  totalOrders: number
  totalAppointments: number
}

interface TopProduct {
  id: string
  name: string
  sold: number
  revenue: number
}

interface TopService {
  id: string
  name: string
  bookings: number
  revenue: number
}

interface TopBarber {
  id: string
  name: string
  appointments: number
  rating: number
  revenue: number
}

interface RevenueData {
  date: string
  revenue: number
}

export function AdminDashboardPage() {
  const { loading: authLoading } = useAdminAuth()
  
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    netProfit: 0,
    pendingPayments: 0,
    avgTransaction: 0,
    totalOrders: 0,
    totalAppointments: 0,
  })
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [topServices, setTopServices] = useState<TopService[]>([])
  const [topBarbers, setTopBarbers] = useState<TopBarber[]>([])
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [statsLoading, setStatsLoading] = useState(true)
  
  useEffect(() => {
    if (!authLoading) {
      loadDashboardStats()
      
      // Refresh stats every 30 seconds
      const interval = setInterval(loadDashboardStats, 30000)
      
      return () => clearInterval(interval)
    }
  }, [authLoading])
  
  const loadDashboardStats = async () => {
    try {
      console.log('🔄 Loading dashboard stats...', new Date().toLocaleTimeString())
      
      let totalRevenue = 0
      let totalOrders = 0
      let completedAppointments = 0
      
      // Get orders data (produk yang sudah dibeli dan completed/paid)
      const ordersRef = collection(adminFirestore, 'orders')
      const ordersSnapshot = await getDocs(ordersRef)
      
      console.log(`📦 Total orders in DB: ${ordersSnapshot.size}`)
      
      ordersSnapshot.docs.forEach((orderDoc) => {
        const order = orderDoc.data()
        // Hanya hitung order yang sudah completed atau paid
        if (order.status === 'completed' || order.status === 'paid') {
          const amount = order.totalAmount || 0
          totalRevenue += amount
          totalOrders++
          console.log(`💰 Order ${orderDoc.id}: Rp ${amount.toLocaleString('id-ID')} (${order.status})`)
        }
      })
      
      console.log(`📊 Total Orders Revenue: Rp ${totalRevenue.toLocaleString('id-ID')} dari ${totalOrders} orders`)
      
      // Get appointments data (layanan yang sudah dikonfirmasi selesai)
      const appointmentsRef = collection(adminFirestore, 'appointments')
      const appointmentsSnapshot = await getDocs(appointmentsRef)
      
      // Hitung revenue dari appointment yang status 'completed'
      for (const appointmentDoc of appointmentsSnapshot.docs) {
        const appointment = appointmentDoc.data()
        
        if (appointment.status === 'completed') {
          completedAppointments++
          
          // Ambil harga service dari collection services
          if (appointment.serviceId) {
            try {
              const serviceDoc = await getDoc(doc(adminFirestore, 'services', appointment.serviceId))
              if (serviceDoc.exists()) {
                const serviceData = serviceDoc.data()
                totalRevenue += serviceData.price || 0
              }
            } catch (error) {
              console.error('Error fetching service price:', error)
            }
          }
        }
      }
      
      // Get pending payments (count orders dengan status pending_payment)
      const pendingOrdersQuery = query(ordersRef, where('status', '==', 'pending_payment'))
      const paymentsSnapshot = await getDocs(pendingOrdersQuery)
      
      // Total transactions = orders + completed appointments
      const totalTransactions = totalOrders + completedAppointments
      
      // Calculate Top Products dari orders
      const productStats: Record<string, { name: string; sold: number; revenue: number }> = {}
      
      ordersSnapshot.docs.forEach((orderDoc) => {
        const order = orderDoc.data()
        if (order.status === 'completed' || order.status === 'paid') {
          order.items?.forEach((item: any) => {
            const productId = item.productId || item.id
            if (!productStats[productId]) {
              productStats[productId] = {
                name: item.productName || item.name || 'Unknown Product',
                sold: 0,
                revenue: 0
              }
            }
            productStats[productId].sold += item.quantity || 0
            productStats[productId].revenue += (item.price || 0) * (item.quantity || 0)
          })
        }
      })
      
      // Fetch missing product names from products collection
      const productsWithUnknownName = Object.entries(productStats)
        .filter(([_, data]) => data.name === 'Unknown Product')
        .map(([id]) => id)
      
      for (const productId of productsWithUnknownName) {
        try {
          const productDoc = await getDoc(doc(adminFirestore, 'products', productId))
          if (productDoc.exists()) {
            const productData = productDoc.data()
            productStats[productId].name = productData.name || 'Unknown Product'
          }
        } catch (error) {
          console.error(`Error fetching product ${productId}:`, error)
        }
      }
      
      const topProductsList = Object.entries(productStats)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3)
      
      console.log('📦 Top Products:', topProductsList)
      
      // Calculate Top Services dari appointments
      const serviceStats: Record<string, { name: string; bookings: number; revenue: number }> = {}
      
      for (const appointmentDoc of appointmentsSnapshot.docs) {
        const appointment = appointmentDoc.data()
        if (appointment.status === 'completed' && appointment.serviceId) {
          try {
            const serviceDoc = await getDoc(doc(adminFirestore, 'services', appointment.serviceId))
            if (serviceDoc.exists()) {
              const serviceData = serviceDoc.data()
              const serviceId = appointment.serviceId
              
              if (!serviceStats[serviceId]) {
                serviceStats[serviceId] = {
                  name: serviceData.name || 'Unknown Service',
                  bookings: 0,
                  revenue: 0
                }
              }
              serviceStats[serviceId].bookings += 1
              serviceStats[serviceId].revenue += serviceData.price || 0
            }
          } catch (error) {
            console.error('Error fetching service:', error)
          }
        }
      }
      
      const topServicesList = Object.entries(serviceStats)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3)
      
      // Calculate Top Barbers dari appointments
      const barberStats: Record<string, { name: string; appointments: number; revenue: number; totalRating: number; ratingCount: number }> = {}
      
      for (const appointmentDoc of appointmentsSnapshot.docs) {
        const appointment = appointmentDoc.data()
        if (appointment.status === 'completed' && appointment.barberId) {
          try {
            const barberDoc = await getDoc(doc(adminFirestore, 'barbers', appointment.barberId))
            if (barberDoc.exists()) {
              const barberData = barberDoc.data()
              const barberId = appointment.barberId
              
              if (!barberStats[barberId]) {
                barberStats[barberId] = {
                  name: barberData.name || 'Unknown Barber',
                  appointments: 0,
                  revenue: 0,
                  totalRating: 0,
                  ratingCount: 0
                }
              }
              barberStats[barberId].appointments += 1
              
              // Get service price for revenue
              if (appointment.serviceId) {
                try {
                  const serviceDoc = await getDoc(doc(adminFirestore, 'services', appointment.serviceId))
                  if (serviceDoc.exists()) {
                    const serviceData = serviceDoc.data()
                    barberStats[barberId].revenue += serviceData.price || 0
                  }
                } catch (error) {
                  console.error('Error fetching service for barber stats:', error)
                }
              }
              
              // Calculate rating
              if (appointment.rating) {
                barberStats[barberId].totalRating += appointment.rating
                barberStats[barberId].ratingCount += 1
              }
            }
          } catch (error) {
            console.error('Error fetching barber:', error)
          }
        }
      }
      
      const topBarbersList = Object.entries(barberStats)
        .map(([id, data]) => ({
          id,
          name: data.name,
          appointments: data.appointments,
          rating: data.ratingCount > 0 ? data.totalRating / data.ratingCount : 0,
          revenue: data.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3)
      
      // Calculate Revenue Trend (Last 30 Days)
      const dailyRevenue: Record<string, number> = {}
      const today = new Date()
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      // Initialize all days with 0
      for (let i = 0; i < 30; i++) {
        const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
        const dateKey = date.toISOString().split('T')[0]
        dailyRevenue[dateKey] = 0
      }
      
      // Aggregate orders by day
      ordersSnapshot.docs.forEach((orderDoc) => {
        const order = orderDoc.data()
        if (order.status === 'completed' || order.status === 'paid') {
          const orderDate = order.createdAt?.toDate?.() || new Date(order.createdAt)
          const dateKey = orderDate.toISOString().split('T')[0]
          
          if (dailyRevenue[dateKey] !== undefined) {
            dailyRevenue[dateKey] += order.totalAmount || 0
          }
        }
      })
      
      // Aggregate appointments by day
      for (const appointmentDoc of appointmentsSnapshot.docs) {
        const appointment = appointmentDoc.data()
        if (appointment.status === 'completed' && appointment.serviceId) {
          try {
            const serviceDoc = await getDoc(doc(adminFirestore, 'services', appointment.serviceId))
            if (serviceDoc.exists()) {
              const serviceData = serviceDoc.data()
              const appointmentDate = appointment.createdAt?.toDate?.() || new Date(appointment.createdAt)
              const dateKey = appointmentDate.toISOString().split('T')[0]
              
              if (dailyRevenue[dateKey] !== undefined) {
                dailyRevenue[dateKey] += serviceData.price || 0
              }
            }
          } catch (error) {
            console.error('Error fetching service for revenue trend:', error)
          }
        }
      }
      
      // Convert to array and format
      const revenueChartData = Object.entries(dailyRevenue)
        .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
        .map(([date, revenue]) => ({
          date: new Date(date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
          revenue
        }))
      
      // Update stats
      setStats({
        totalRevenue,
        netProfit: totalRevenue * 0.54,
        pendingPayments: paymentsSnapshot.size,
        avgTransaction: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
        totalOrders: totalTransactions,
        totalAppointments: appointmentsSnapshot.size,
      })
      
      setTopProducts(topProductsList)
      setTopServices(topServicesList)
      setTopBarbers(topBarbersList)
      setRevenueData(revenueChartData)
      
      setStatsLoading(false)
    } catch (error) {
      console.error('Failed to load dashboard stats:', error)
      setStatsLoading(false)
    }
  }
  
  if (authLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">⏳</div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, Admin</p>
        </div>
        <button
          onClick={loadDashboardStats}
          disabled={statsLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
        >
          <span>🔄</span>
          <span>{statsLoading ? 'Loading...' : 'Refresh Stats'}</span>
        </button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-800">
                Rp {stats.totalRevenue.toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Dari {stats.totalOrders} transaksi selesai
              </p>
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
      
      {/* Revenue Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Revenue Trend
            </h2>
            <p className="text-sm text-gray-500 mt-1">Last 30 days performance</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span className="text-gray-600">Revenue</span>
            </div>
          </div>
        </div>
        
        {revenueData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
                tickFormatter={(value) => `Rp ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px'
                }}
                formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, 'Revenue']}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#2563eb" 
                strokeWidth={2}
                dot={{ fill: '#2563eb', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
            <p className="text-gray-400">No revenue data available</p>
          </div>
        )}
      </div>
      
      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            🏆 Top Products
          </h3>
          <div className="space-y-3">
            {topProducts.length > 0 ? (
              topProducts.map((product) => (
                <div key={product.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.sold} sold</p>
                  </div>
                  <p className="font-semibold text-gray-800">
                    Rp {product.revenue.toLocaleString('id-ID')}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-400">
                <p className="text-sm">Belum ada data produk terjual</p>
              </div>
            )}
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
            {topServices.length > 0 ? (
              topServices.map((service) => (
                <div key={service.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800">{service.name}</p>
                    <p className="text-sm text-gray-500">{service.bookings} bookings</p>
                  </div>
                  <p className="font-semibold text-gray-800">
                    Rp {service.revenue.toLocaleString('id-ID')}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-400">
                <p className="text-sm">Belum ada data layanan</p>
              </div>
            )}
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
            {topBarbers.length > 0 ? (
              topBarbers.map((barber) => (
                <div key={barber.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800">{barber.name}</p>
                    <p className="text-sm text-gray-500">
                      {barber.rating > 0 ? `${barber.rating.toFixed(1)}⭐` : 'No rating'} ({barber.appointments} appts)
                    </p>
                  </div>
                  <p className="font-semibold text-gray-800">
                    Rp {barber.revenue.toLocaleString('id-ID')}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-400">
                <p className="text-sm">Belum ada data barber</p>
              </div>
            )}
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
