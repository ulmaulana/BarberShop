import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { adminFirestore } from '../../../config/firebaseAdmin'
import { Link } from 'react-router-dom'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { FinancialSkeleton } from '../../../components/admin/SkeletonLoader'

interface FinancialStats {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  ordersCount: number
  avgOrderValue: number
  productIncome: number
  serviceIncome: number
  productCount: number
  serviceCount: number
}

interface PeriodData {
  income: number
  expenses: number
  profit: number
}

interface ProductStat {
  id: string
  name: string
  sold: number
  revenue: number
}

interface ServiceStat {
  id: string
  name: string
  bookings: number
  revenue: number
}

export function FinancialDashboardPage() {
  const { loading: authLoading, user } = useAdminAuth()
  const [stats, setStats] = useState<FinancialStats>({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    ordersCount: 0,
    avgOrderValue: 0,
    productIncome: 0,
    serviceIncome: 0,
    productCount: 0,
    serviceCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month')
  const [periodData, setPeriodData] = useState<PeriodData>({
    income: 0,
    expenses: 0,
    profit: 0,
  })
  const [topProducts, setTopProducts] = useState<ProductStat[]>([])
  const [bottomProducts, setBottomProducts] = useState<ProductStat[]>([])
  const [topServices, setTopServices] = useState<ServiceStat[]>([])
  const [bottomServices, setBottomServices] = useState<ServiceStat[]>([])
  const [sortBy, setSortBy] = useState<'revenue' | 'qty' | 'name'>('revenue')
  const [activeTab, setActiveTab] = useState<'product' | 'service'>('product')
  
  useEffect(() => {
    // Tunggu auth selesai loading dan user sudah login
    if (authLoading) {
      console.log('[Financial] Waiting for auth...')
      return
    }
    if (!user) {
      console.log('[Financial] No user logged in')
      setLoading(false)
      return
    }
    console.log('[Financial] useEffect triggered, user:', user.email, 'period:', period)
    loadFinancialData()
  }, [period, authLoading, user])
  
  const getDateRange = () => {
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }
    
    return { startDate, endDate: now }
  }
  
  const parseDate = (dateValue: unknown): Date | null => {
    if (!dateValue) return null
    // Firestore Timestamp
    if (typeof dateValue === 'object' && 'toDate' in (dateValue as Record<string, unknown>)) {
      return (dateValue as { toDate: () => Date }).toDate()
    }
    // String ISO date atau date string (YYYY-MM-DD)
    if (typeof dateValue === 'string') {
      return new Date(dateValue)
    }
    return null
  }
  
  const loadFinancialData = async () => {
    try {
      setLoading(true)
      const { startDate, endDate } = getDateRange()
      
      console.log(`[Financial] Loading data for period: ${period}`)
      
      // Pre-fetch all services and products for caching (major optimization)
      const [servicesSnapshot, productsSnapshot] = await Promise.all([
        getDocs(collection(adminFirestore, 'services')),
        getDocs(collection(adminFirestore, 'products'))
      ])
      
      const servicesCache: Record<string, { name: string; price: number }> = {}
      servicesSnapshot.docs.forEach(serviceDoc => {
        servicesCache[serviceDoc.id] = {
          name: serviceDoc.data().name || 'Unknown',
          price: serviceDoc.data().price || 0
        }
      })
      
      const productsCache: Record<string, { name: string; price: number }> = {}
      productsSnapshot.docs.forEach(productDoc => {
        productsCache[productDoc.id] = {
          name: productDoc.data().name || 'Unknown',
          price: productDoc.data().price || 0
        }
      })
      
      console.log(`[Financial] Cached ${Object.keys(servicesCache).length} services, ${Object.keys(productsCache).length} products`)
      
      // Load all data in parallel
      const [ordersSnapshot, appointmentsSnapshot, expensesSnapshot] = await Promise.all([
        getDocs(collection(adminFirestore, 'orders')),
        getDocs(collection(adminFirestore, 'appointments')),
        getDocs(collection(adminFirestore, 'expenses'))
      ])
      
      let totalIncome = 0
      let ordersCount = 0
      let productIncome = 0
      let appointmentsIncome = 0
      let appointmentsCount = 0
      
      // Process orders
      ordersSnapshot.docs.forEach(orderDoc => {
        const data = orderDoc.data()
        const orderDate = parseDate(data.createdAt)
        
        if ((data.status === 'completed' || data.status === 'paid') && orderDate) {
          if (orderDate >= startDate && orderDate <= endDate) {
            const amount = data.totalAmount || 0
            totalIncome += amount
            productIncome += amount
            ordersCount++
          }
        }
      })
      
      // Process appointments using cache
      appointmentsSnapshot.docs.forEach(appointmentDoc => {
        const data = appointmentDoc.data()
        const appointmentDateStr = data.date as string
        const appointmentDate = appointmentDateStr ? new Date(appointmentDateStr + 'T00:00:00') : null
        
        if (data.status === 'completed' && appointmentDate) {
          if (appointmentDate >= startDate && appointmentDate <= endDate) {
            if (data.serviceId && servicesCache[data.serviceId]) {
              appointmentsIncome += servicesCache[data.serviceId].price
              appointmentsCount++
            }
          }
        }
      })
      
      console.log(`[Financial] Income: Orders Rp ${productIncome.toLocaleString('id-ID')}, Services Rp ${appointmentsIncome.toLocaleString('id-ID')}`)
      
      // Total income = orders + appointments
      totalIncome += appointmentsIncome
      const totalTransactions = ordersCount + appointmentsCount
      
      // Process expenses (already fetched in parallel)
      let totalExpenses = 0
      expensesSnapshot.docs.forEach(expDoc => {
        const data = expDoc.data()
        const expenseDate = parseDate(data.date)
        
        if (expenseDate && expenseDate >= startDate && expenseDate <= endDate) {
          totalExpenses += data.amount || 0
        }
      })
      
      console.log(`[Financial] Expenses: Rp ${totalExpenses.toLocaleString('id-ID')}`)
      
      const netProfit = totalIncome - totalExpenses
      const avgOrderValue = totalTransactions > 0 ? totalIncome / totalTransactions : 0
      
      console.log(`[Financial] Summary - Income: Rp ${totalIncome.toLocaleString('id-ID')}, Expenses: Rp ${totalExpenses.toLocaleString('id-ID')}, Profit: Rp ${netProfit.toLocaleString('id-ID')}`)
      console.log(`[Financial] Total transactions: ${totalTransactions} (${ordersCount} orders + ${appointmentsCount} appointments)`)
      
      setStats({
        totalIncome,
        totalExpenses,
        netProfit,
        ordersCount: totalTransactions,
        avgOrderValue,
        productIncome,
        serviceIncome: appointmentsIncome,
        productCount: ordersCount,
        serviceCount: appointmentsCount,
      })
      
      setPeriodData({
        income: totalIncome,
        expenses: totalExpenses,
        profit: netProfit,
      })
      
      // Calculate All Products - initialize from cache first (includes 0 sold)
      const productStats: Record<string, ProductStat> = {}
      
      // Initialize all products from cache
      Object.entries(productsCache).forEach(([id, cached]) => {
        productStats[id] = {
          id,
          name: cached.name,
          sold: 0,
          revenue: 0,
        }
      })
      
      // Count sales from orders
      ordersSnapshot.docs.forEach(orderDoc => {
        const data = orderDoc.data()
        const orderDate = parseDate(data.createdAt)
        
        if ((data.status === 'completed' || data.status === 'paid') && orderDate) {
          if (orderDate >= startDate && orderDate <= endDate) {
            data.items?.forEach((item: { productId?: string; id?: string; productName?: string; name?: string; quantity?: number; price?: number }) => {
              const productId = item.productId || item.id || 'unknown'
              const productName = item.productName || item.name || 'Unknown Product'
              
              if (!productStats[productId]) {
                productStats[productId] = {
                  id: productId,
                  name: productName,
                  sold: 0,
                  revenue: 0,
                }
              }
              productStats[productId].sold += item.quantity || 1
              productStats[productId].revenue += (item.price || 0) * (item.quantity || 1)
            })
          }
        }
      })
      
      const sortedProducts = Object.values(productStats).sort((a, b) => b.revenue - a.revenue)
      // Masukkan semua produk
      setTopProducts(sortedProducts)
      setBottomProducts([])
      
      // Calculate Top/Bottom Services using cache
      const serviceStats: Record<string, ServiceStat> = {}
      
      // Initialize all services from cache (includes those with 0 bookings)
      Object.entries(servicesCache).forEach(([id, cached]) => {
        serviceStats[id] = {
          id,
          name: cached.name,
          bookings: 0,
          revenue: 0,
        }
      })
      
      // Count bookings from appointments using cache
      appointmentsSnapshot.docs.forEach(appointmentDoc => {
        const data = appointmentDoc.data()
        const appointmentDateStr = data.date as string
        const appointmentDate = appointmentDateStr ? new Date(appointmentDateStr + 'T00:00:00') : null
        
        if (data.status === 'completed' && appointmentDate) {
          if (appointmentDate >= startDate && appointmentDate <= endDate) {
            if (data.serviceId && serviceStats[data.serviceId] && servicesCache[data.serviceId]) {
              serviceStats[data.serviceId].bookings += 1
              serviceStats[data.serviceId].revenue += servicesCache[data.serviceId].price
            }
          }
        }
      })
      
      const sortedServices = Object.values(serviceStats).sort((a, b) => b.revenue - a.revenue)
      // Masukkan semua layanan, tidak dibatasi top 5 / bottom 5
      setTopServices(sortedServices)
      setBottomServices([])
      
    } catch (error) {
      console.error('[Financial] ERROR:', error)
      alert('Error loading financial data: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }
  
  const getProfitMargin = () => {
    if (stats.totalIncome === 0) return 0
    return ((stats.netProfit / stats.totalIncome) * 100).toFixed(1)
  }
  
  const getPeriodLabel = () => {
    const labels = {
      today: "Today's",
      week: 'Last 7 Days',
      month: 'Last 30 Days',
      year: 'Last Year',
    }
    return labels[period]
  }
  
  if (loading) {
    return <FinancialSkeleton />
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Financial Dashboard</h1>
          <p className="text-gray-500 mt-1">{getPeriodLabel()} Overview</p>
        </div>
        
        {/* Period Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('today')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              period === 'today'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              period === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              period === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              period === 'year'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Year
          </button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Income */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Income</p>
              <p className="text-2xl font-bold text-gray-800">
                Rp {stats.totalIncome.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
          <p className="text-sm text-gray-600">
            {stats.ordersCount} transaksi selesai
          </p>
        </div>
        
        {/* Total Expenses */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-800">
                Rp {stats.totalExpenses.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="text-4xl">📉</div>
          </div>
          <Link
            to="/adminpanel/expenses"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Manage expenses →
          </Link>
        </div>
        
        {/* Net Profit */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Net Profit</p>
              <p className={`text-2xl font-bold ${
                stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                Rp {stats.netProfit.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="text-4xl">
              {stats.netProfit >= 0 ? '📈' : '📉'}
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {getProfitMargin()}% profit margin
          </p>
        </div>
        
        {/* Average Transaction */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Rata-rata Transaksi</p>
              <p className="text-2xl font-bold text-gray-800">
                Rp {Math.round(stats.avgOrderValue).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="text-4xl">🎯</div>
          </div>
          <p className="text-sm text-gray-600">
            Per transaksi selesai
          </p>
        </div>
      </div>
      
      {/* Income Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Income Breakdown
          </h3>
          {stats.totalIncome > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Product Sales', value: stats.productIncome, color: '#3B82F6' },
                    { name: 'Service Income', value: stats.serviceIncome, color: '#10B981' },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  <Cell fill="#3B82F6" />
                  <Cell fill="#10B981" />
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
              <p className="text-gray-400">No income data available</p>
            </div>
          )}
        </div>
        
        {/* Income Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Income Details
          </h3>
          <div className="space-y-4">
            {/* Product Sales */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="font-medium text-gray-800">Product Sales</span>
                </div>
                <span className="text-lg font-bold text-blue-600">
                  Rp {stats.productIncome.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{stats.productCount} orders completed</span>
                <span>
                  {stats.totalIncome > 0 
                    ? `${((stats.productIncome / stats.totalIncome) * 100).toFixed(1)}%`
                    : '0%'
                  } of total
                </span>
              </div>
              <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: stats.totalIncome > 0
                      ? `${(stats.productIncome / stats.totalIncome) * 100}%`
                      : '0%'
                  }}
                />
              </div>
            </div>
            
            {/* Service Income */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="font-medium text-gray-800">Service Income</span>
                </div>
                <span className="text-lg font-bold text-green-600">
                  Rp {stats.serviceIncome.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{stats.serviceCount} appointments completed</span>
                <span>
                  {stats.totalIncome > 0 
                    ? `${((stats.serviceIncome / stats.totalIncome) * 100).toFixed(1)}%`
                    : '0%'
                  } of total
                </span>
              </div>
              <div className="mt-2 w-full bg-green-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: stats.totalIncome > 0
                      ? `${(stats.serviceIncome / stats.totalIncome) * 100}%`
                      : '0%'
                  }}
                />
              </div>
            </div>
            
            {/* Average per transaction */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-500">Avg Product Order</p>
                  <p className="text-lg font-bold text-gray-800">
                    Rp {stats.productCount > 0 
                      ? Math.round(stats.productIncome / stats.productCount).toLocaleString('id-ID')
                      : '0'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg Service Fee</p>
                  <p className="text-lg font-bold text-gray-800">
                    Rp {stats.serviceCount > 0 
                      ? Math.round(stats.serviceIncome / stats.serviceCount).toLocaleString('id-ID')
                      : '0'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Products & Services Performance - Combined with Tabs */}
      <div className="bg-white rounded-lg shadow">
        {/* Header with Tabs and Sort */}
        <div className="border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 pt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 sm:mb-0">
              Performa Penjualan
            </h3>
            <div className="flex items-center gap-2 mb-3 sm:mb-0">
              <span className="text-sm text-gray-500">Urutkan:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'revenue' | 'qty' | 'name')}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="revenue">Revenue Tertinggi</option>
                <option value="qty">Qty Terbanyak</option>
                <option value="name">Nama A-Z</option>
              </select>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex px-6">
            <button
              onClick={() => setActiveTab('product')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'product'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📦 Produk
            </button>
            <button
              onClick={() => setActiveTab('service')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'service'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ✂️ Layanan
            </button>
          </div>
        </div>
        
        {/* Table Content */}
        <div className="p-6">
          {activeTab === 'product' ? (
            // Products Table
            [...topProducts, ...bottomProducts].length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">#</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Nama Produk</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Terjual</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">Revenue</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...topProducts, ...bottomProducts]
                      .sort((a, b) => {
                        if (sortBy === 'revenue') return b.revenue - a.revenue
                        if (sortBy === 'qty') return b.sold - a.sold
                        return a.name.localeCompare(b.name)
                      })
                      .map((product, index) => (
                      <tr key={product.id} className={`border-t border-gray-100 hover:bg-gray-50 ${product.sold === 0 ? 'bg-red-50' : ''}`}>
                        <td className="py-3 px-4">
                          <span className={`w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-bold ${
                            index === 0 ? 'bg-yellow-400 text-yellow-900' :
                            index === 1 ? 'bg-gray-300 text-gray-700' :
                            index === 2 ? 'bg-orange-300 text-orange-800' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-800">{product.name}</td>
                        <td className={`py-3 px-4 text-center ${product.sold === 0 ? 'text-red-500' : 'text-gray-600'}`}>{product.sold}</td>
                        <td className={`py-3 px-4 text-right font-semibold ${product.revenue === 0 ? 'text-red-500' : 'text-green-600'}`}>
                          Rp {product.revenue.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            product.sold === 0 
                              ? 'bg-red-100 text-red-700' 
                              : product.sold >= 5 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {product.sold === 0 ? 'Tidak Laku' : product.sold >= 5 ? 'Laris' : 'Normal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">Tidak ada data produk</div>
            )
          ) : (
            // Services Table
            [...topServices, ...bottomServices].length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">#</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Nama Layanan</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Booking</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">Revenue</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...topServices, ...bottomServices]
                      .sort((a, b) => {
                        if (sortBy === 'revenue') return b.revenue - a.revenue
                        if (sortBy === 'qty') return b.bookings - a.bookings
                        return a.name.localeCompare(b.name)
                      })
                      .map((service, index) => (
                      <tr key={service.id} className={`border-t border-gray-100 hover:bg-gray-50 ${service.bookings === 0 ? 'bg-red-50' : ''}`}>
                        <td className="py-3 px-4">
                          <span className={`w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-bold ${
                            index === 0 ? 'bg-yellow-400 text-yellow-900' :
                            index === 1 ? 'bg-gray-300 text-gray-700' :
                            index === 2 ? 'bg-orange-300 text-orange-800' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-800">{service.name}</td>
                        <td className={`py-3 px-4 text-center ${service.bookings === 0 ? 'text-red-500' : 'text-gray-600'}`}>{service.bookings}</td>
                        <td className={`py-3 px-4 text-right font-semibold ${service.revenue === 0 ? 'text-red-500' : 'text-green-600'}`}>
                          Rp {service.revenue.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            service.bookings === 0 
                              ? 'bg-red-100 text-red-700' 
                              : service.bookings >= 5 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {service.bookings === 0 ? 'Tidak Ada Booking' : service.bookings >= 5 ? 'Laris' : 'Normal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">Tidak ada data layanan</div>
            )
          )}
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/adminpanel/expenses"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
        >
          <div className="text-3xl mb-3">💳</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Manage Expenses
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Add and track business expenses
          </p>
          <span className="text-blue-600 text-sm font-medium">
            Go to Expenses →
          </span>
        </Link>
        
        <Link
          to="/adminpanel/payments"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
        >
          <div className="text-3xl mb-3">✅</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Verify Payments
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Review and approve pending payments
          </p>
          <span className="text-blue-600 text-sm font-medium">
            Go to Payments →
          </span>
        </Link>
        
        <Link
          to="/adminpanel/reports"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
        >
          <div className="text-3xl mb-3">📊</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Generate Reports
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Download financial reports
          </p>
          <span className="text-blue-600 text-sm font-medium">
            Go to Reports →
          </span>
        </Link>
      </div>
      
      {/* Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Financial Summary - {getPeriodLabel()}
        </h3>
        
        <div className="space-y-4">
          {/* Income Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Income</span>
              <span className="text-sm font-bold text-green-600">
                Rp {periodData.income.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full"
                style={{ width: '100%' }}
              />
            </div>
          </div>
          
          {/* Expenses Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Expenses</span>
              <span className="text-sm font-bold text-red-600">
                Rp {periodData.expenses.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-red-500 h-3 rounded-full"
                style={{
                  width: periodData.income > 0
                    ? `${(periodData.expenses / periodData.income) * 100}%`
                    : '0%'
                }}
              />
            </div>
          </div>
          
          {/* Profit Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Net Profit</span>
              <span className={`text-sm font-bold ${
                periodData.profit >= 0 ? 'text-blue-600' : 'text-red-600'
              }`}>
                Rp {periodData.profit.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  periodData.profit >= 0 ? 'bg-blue-500' : 'bg-red-500'
                }`}
                style={{
                  width: periodData.income > 0
                    ? `${Math.abs((periodData.profit / periodData.income) * 100)}%`
                    : '0%'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
