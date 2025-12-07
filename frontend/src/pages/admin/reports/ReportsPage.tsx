import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { adminFirestore } from '../../../config/firebaseAdmin'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { ReportsSkeleton } from '../../../components/admin/SkeletonLoader'

type ReportType = 'sales' | 'revenue' | 'products' | 'services' | 'barbers'
type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly'

interface SalesData {
  date: string
  productSales: number
  serviceSales: number
  total: number
}

interface ProductReport {
  id: string
  name: string
  sold: number
  revenue: number
}

interface ServiceReport {
  id: string
  name: string
  bookings: number
  revenue: number
}

interface BarberReport {
  id: string
  name: string
  appointments: number
  revenue: number
  rating: number
}

export function ReportsPage() {
  const { loading: authLoading, user } = useAdminAuth()
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState<ReportType>('revenue')
  const [period, setPeriod] = useState<PeriodType>('monthly')
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [productReports, setProductReports] = useState<ProductReport[]>([])
  const [serviceReports, setServiceReports] = useState<ServiceReport[]>([])
  const [barberReports, setBarberReports] = useState<BarberReport[]>([])
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalAppointments: 0,
    avgOrderValue: 0
  })

  useEffect(() => {
    if (!authLoading && user) {
      loadReportData()
    }
  }, [authLoading, user, reportType, period, dateRange])

  const loadReportData = async () => {
    try {
      setLoading(true)
      const startDate = new Date(dateRange.start)
      const endDate = new Date(dateRange.end)
      endDate.setHours(23, 59, 59, 999)

      // Fetch all data in parallel
      const [ordersSnapshot, appointmentsSnapshot, servicesSnapshot, barbersSnapshot, productsSnapshot] = await Promise.all([
        getDocs(collection(adminFirestore, 'orders')),
        getDocs(collection(adminFirestore, 'appointments')),
        getDocs(collection(adminFirestore, 'services')),
        getDocs(collection(adminFirestore, 'barbers')),
        getDocs(collection(adminFirestore, 'products'))
      ])

      // Cache services and barbers
      const servicesCache: Record<string, { name: string; price: number }> = {}
      servicesSnapshot.docs.forEach(doc => {
        servicesCache[doc.id] = { name: doc.data().name, price: doc.data().price || 0 }
      })

      const barbersCache: Record<string, { name: string }> = {}
      barbersSnapshot.docs.forEach(doc => {
        barbersCache[doc.id] = { name: doc.data().name }
      })

      const productsCache: Record<string, { name: string; price: number }> = {}
      productsSnapshot.docs.forEach(doc => {
        productsCache[doc.id] = { name: doc.data().name, price: doc.data().price || 0 }
      })

      // Process orders
      const orders = ordersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((order: any) => {
          const orderDate = order.createdAt?.toDate?.() || new Date(order.createdAt)
          return (order.status === 'completed' || order.status === 'paid') && 
                 orderDate >= startDate && orderDate <= endDate
        })

      // Process appointments
      const appointments = appointmentsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((apt: any) => {
          const aptDate = apt.date ? new Date(apt.date + 'T00:00:00') : null
          return apt.status === 'completed' && aptDate && aptDate >= startDate && aptDate <= endDate
        })

      // Calculate summary
      let totalProductRevenue = 0
      let totalServiceRevenue = 0

      orders.forEach((order: any) => {
        totalProductRevenue += order.totalAmount || 0
      })

      appointments.forEach((apt: any) => {
        if (apt.serviceId && servicesCache[apt.serviceId]) {
          totalServiceRevenue += servicesCache[apt.serviceId].price
        }
      })

      setSummary({
        totalRevenue: totalProductRevenue + totalServiceRevenue,
        totalOrders: orders.length,
        totalAppointments: appointments.length,
        avgOrderValue: orders.length > 0 ? totalProductRevenue / orders.length : 0
      })

      // Generate sales data based on period
      const salesByDate: Record<string, SalesData> = {}
      
      orders.forEach((order: any) => {
        const orderDate = order.createdAt?.toDate?.() || new Date(order.createdAt)
        const dateKey = getDateKey(orderDate, period)
        
        if (!salesByDate[dateKey]) {
          salesByDate[dateKey] = { date: dateKey, productSales: 0, serviceSales: 0, total: 0 }
        }
        salesByDate[dateKey].productSales += order.totalAmount || 0
        salesByDate[dateKey].total += order.totalAmount || 0
      })

      appointments.forEach((apt: any) => {
        const aptDate = new Date(apt.date + 'T00:00:00')
        const dateKey = getDateKey(aptDate, period)
        const price = apt.serviceId && servicesCache[apt.serviceId] ? servicesCache[apt.serviceId].price : 0
        
        if (!salesByDate[dateKey]) {
          salesByDate[dateKey] = { date: dateKey, productSales: 0, serviceSales: 0, total: 0 }
        }
        salesByDate[dateKey].serviceSales += price
        salesByDate[dateKey].total += price
      })

      setSalesData(Object.values(salesByDate).sort((a, b) => a.date.localeCompare(b.date)))

      // Product reports
      const productStats: Record<string, ProductReport> = {}
      
      // Initialize from cache
      Object.entries(productsCache).forEach(([id, cached]) => {
        productStats[id] = { id, name: cached.name, sold: 0, revenue: 0 }
      })

      // Process orders - also handle products not in cache (use item name directly)
      orders.forEach((order: any) => {
        order.items?.forEach((item: any) => {
          const productId = item.productId || item.id
          const productName = item.productName || item.name || 'Unknown Product'
          
          if (productStats[productId]) {
            productStats[productId].sold += item.quantity || 1
            productStats[productId].revenue += (item.price || 0) * (item.quantity || 1)
          } else if (productId) {
            // Product not in cache, create from order item data
            productStats[productId] = {
              id: productId,
              name: productName,
              sold: item.quantity || 1,
              revenue: (item.price || 0) * (item.quantity || 1)
            }
          }
        })
      })

      // Filter out products with 0 sales and sort by revenue
      setProductReports(
        Object.values(productStats)
          .filter(p => p.sold > 0)
          .sort((a, b) => b.revenue - a.revenue)
      )

      // Service reports
      const serviceStats: Record<string, ServiceReport> = {}
      
      // Initialize from cache
      Object.entries(servicesCache).forEach(([id, cached]) => {
        serviceStats[id] = { id, name: cached.name, bookings: 0, revenue: 0 }
      })

      // Process appointments - also handle services not in cache
      appointments.forEach((apt: any) => {
        if (apt.serviceId) {
          const serviceName = apt.serviceName || (servicesCache[apt.serviceId]?.name) || 'Unknown Service'
          const servicePrice = servicesCache[apt.serviceId]?.price || apt.servicePrice || 0
          
          if (serviceStats[apt.serviceId]) {
            serviceStats[apt.serviceId].bookings += 1
            serviceStats[apt.serviceId].revenue += servicePrice
          } else {
            // Service not in cache, create from appointment data
            serviceStats[apt.serviceId] = {
              id: apt.serviceId,
              name: serviceName,
              bookings: 1,
              revenue: servicePrice
            }
          }
        }
      })

      // Filter out services with 0 bookings and sort by revenue
      setServiceReports(
        Object.values(serviceStats)
          .filter(s => s.bookings > 0)
          .sort((a, b) => b.revenue - a.revenue)
      )

      // Barber reports
      const barberStats: Record<string, BarberReport & { totalRating: number; ratingCount: number }> = {}
      Object.entries(barbersCache).forEach(([id, cached]) => {
        barberStats[id] = { id, name: cached.name, appointments: 0, revenue: 0, rating: 0, totalRating: 0, ratingCount: 0 }
      })

      appointments.forEach((apt: any) => {
        if (apt.barberId && barberStats[apt.barberId]) {
          barberStats[apt.barberId].appointments += 1
          if (apt.serviceId && servicesCache[apt.serviceId]) {
            barberStats[apt.barberId].revenue += servicesCache[apt.serviceId].price
          }
          if (apt.rating) {
            barberStats[apt.barberId].totalRating += apt.rating
            barberStats[apt.barberId].ratingCount += 1
          }
        }
      })

      setBarberReports(
        Object.values(barberStats)
          .map(b => ({
            ...b,
            rating: b.ratingCount > 0 ? b.totalRating / b.ratingCount : 0
          }))
          .sort((a, b) => b.revenue - a.revenue)
      )

    } catch (error) {
      console.error('Error loading report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDateKey = (date: Date, periodType: PeriodType): string => {
    switch (periodType) {
      case 'daily':
        return date.toISOString().split('T')[0]
      case 'weekly':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        return `W${weekStart.toISOString().split('T')[0]}`
      case 'monthly':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      case 'yearly':
        return String(date.getFullYear())
      default:
        return date.toISOString().split('T')[0]
    }
  }

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`
  }

  const exportToCSV = () => {
    // BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF'
    let csvContent = BOM
    let filename = ''

    // Calculate totals
    const totalProductSales = salesData.reduce((sum, row) => sum + row.productSales, 0)
    const totalServiceSales = salesData.reduce((sum, row) => sum + row.serviceSales, 0)
    const grandTotal = salesData.reduce((sum, row) => sum + row.total, 0)

    switch (reportType) {
      case 'revenue':
      case 'sales':
        csvContent += 'LAPORAN PENJUALAN\n'
        csvContent += `Periode: ${dateRange.start} s/d ${dateRange.end}\n`
        csvContent += `Diekspor pada: ${new Date().toLocaleString('id-ID')}\n\n`
        csvContent += 'Tanggal,Penjualan Produk,Penjualan Layanan,Total\n'
        salesData.forEach(row => {
          csvContent += `${row.date},"${formatCurrency(row.productSales)}","${formatCurrency(row.serviceSales)}","${formatCurrency(row.total)}"\n`
        })
        csvContent += '\n'
        csvContent += `TOTAL,"${formatCurrency(totalProductSales)}","${formatCurrency(totalServiceSales)}","${formatCurrency(grandTotal)}"\n`
        filename = `laporan-penjualan-${dateRange.start}-${dateRange.end}.csv`
        break
      case 'products':
        const totalProductRevenue = productReports.reduce((sum, row) => sum + row.revenue, 0)
        const totalProductSold = productReports.reduce((sum, row) => sum + row.sold, 0)
        csvContent += 'LAPORAN PRODUK\n'
        csvContent += `Periode: ${dateRange.start} s/d ${dateRange.end}\n`
        csvContent += `Diekspor pada: ${new Date().toLocaleString('id-ID')}\n\n`
        csvContent += 'No,Nama Produk,Jumlah Terjual,Revenue\n'
        productReports.forEach((row, index) => {
          csvContent += `${index + 1},"${row.name}",${row.sold},"${formatCurrency(row.revenue)}"\n`
        })
        csvContent += '\n'
        csvContent += `TOTAL,,${totalProductSold},"${formatCurrency(totalProductRevenue)}"\n`
        filename = `laporan-produk-${dateRange.start}-${dateRange.end}.csv`
        break
      case 'services':
        const totalServiceRevenue = serviceReports.reduce((sum, row) => sum + row.revenue, 0)
        const totalBookings = serviceReports.reduce((sum, row) => sum + row.bookings, 0)
        csvContent += 'LAPORAN LAYANAN\n'
        csvContent += `Periode: ${dateRange.start} s/d ${dateRange.end}\n`
        csvContent += `Diekspor pada: ${new Date().toLocaleString('id-ID')}\n\n`
        csvContent += 'No,Nama Layanan,Jumlah Booking,Revenue\n'
        serviceReports.forEach((row, index) => {
          csvContent += `${index + 1},"${row.name}",${row.bookings},"${formatCurrency(row.revenue)}"\n`
        })
        csvContent += '\n'
        csvContent += `TOTAL,,${totalBookings},"${formatCurrency(totalServiceRevenue)}"\n`
        filename = `laporan-layanan-${dateRange.start}-${dateRange.end}.csv`
        break
      case 'barbers':
        const totalBarberRevenue = barberReports.reduce((sum, row) => sum + row.revenue, 0)
        const totalAppointments = barberReports.reduce((sum, row) => sum + row.appointments, 0)
        const avgRating = barberReports.length > 0 
          ? barberReports.reduce((sum, row) => sum + row.rating, 0) / barberReports.length 
          : 0
        csvContent += 'LAPORAN BARBER\n'
        csvContent += `Periode: ${dateRange.start} s/d ${dateRange.end}\n`
        csvContent += `Diekspor pada: ${new Date().toLocaleString('id-ID')}\n\n`
        csvContent += 'No,Nama Barber,Jumlah Appointments,Revenue,Rating\n'
        barberReports.forEach((row, index) => {
          csvContent += `${index + 1},"${row.name}",${row.appointments},"${formatCurrency(row.revenue)}",${row.rating.toFixed(1)}\n`
        })
        csvContent += '\n'
        csvContent += `TOTAL,,${totalAppointments},"${formatCurrency(totalBarberRevenue)}",${avgRating.toFixed(1)}\n`
        filename = `laporan-barber-${dateRange.start}-${dateRange.end}.csv`
        break
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  }

  if (authLoading) {
    return <ReportsSkeleton />
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Laporan</h1>
          <p className="text-gray-600">Analisis dan export data bisnis</p>
        </div>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
        >
          <span>📥</span> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Laporan</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="revenue">Pendapatan</option>
              <option value="sales">Penjualan</option>
              <option value="products">Produk</option>
              <option value="services">Layanan</option>
              <option value="barbers">Barber</option>
            </select>
          </div>

          {/* Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Periode</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="daily">Harian</option>
              <option value="weekly">Mingguan</option>
              <option value="monthly">Bulanan</option>
              <option value="yearly">Tahunan</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Pendapatan</p>
          <p className="text-xl font-bold text-green-600">Rp {summary.totalRevenue.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Order</p>
          <p className="text-xl font-bold text-blue-600">{summary.totalOrders}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Appointment</p>
          <p className="text-xl font-bold text-purple-600">{summary.totalAppointments}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Rata-rata Order</p>
          <p className="text-xl font-bold text-orange-600">Rp {summary.avgOrderValue.toLocaleString('id-ID')}</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Chart */}
          {(reportType === 'revenue' || reportType === 'sales') && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {reportType === 'revenue' ? 'Grafik Pendapatan' : 'Grafik Penjualan'}
              </h3>
              {salesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  {reportType === 'revenue' ? (
                    <LineChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`} />
                      <Line type="monotone" dataKey="total" stroke="#10B981" strokeWidth={2} name="Total" />
                      <Line type="monotone" dataKey="productSales" stroke="#3B82F6" strokeWidth={2} name="Produk" />
                      <Line type="monotone" dataKey="serviceSales" stroke="#8B5CF6" strokeWidth={2} name="Layanan" />
                    </LineChart>
                  ) : (
                    <BarChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`} />
                      <Bar dataKey="productSales" fill="#3B82F6" name="Produk" />
                      <Bar dataKey="serviceSales" fill="#8B5CF6" name="Layanan" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-400 py-8">Tidak ada data untuk periode ini</p>
              )}
            </div>
          )}

          {/* Products Table */}
          {reportType === 'products' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Laporan Produk</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">#</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Nama Produk</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Terjual</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productReports.map((product, index) => (
                      <tr key={product.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">{index + 1}</td>
                        <td className="py-3 px-4 font-medium text-gray-800">{product.name}</td>
                        <td className={`py-3 px-4 text-center ${product.sold === 0 ? 'text-red-500' : 'text-gray-600'}`}>
                          {product.sold}
                        </td>
                        <td className={`py-3 px-4 text-right font-semibold ${product.revenue === 0 ? 'text-red-500' : 'text-green-600'}`}>
                          Rp {product.revenue.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td colSpan={2} className="py-3 px-4">Total</td>
                      <td className="py-3 px-4 text-center">{productReports.reduce((sum, p) => sum + p.sold, 0)}</td>
                      <td className="py-3 px-4 text-right text-green-600">
                        Rp {productReports.reduce((sum, p) => sum + p.revenue, 0).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Services Table */}
          {reportType === 'services' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Laporan Layanan</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">#</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Nama Layanan</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Booking</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceReports.map((service, index) => (
                      <tr key={service.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">{index + 1}</td>
                        <td className="py-3 px-4 font-medium text-gray-800">{service.name}</td>
                        <td className={`py-3 px-4 text-center ${service.bookings === 0 ? 'text-red-500' : 'text-gray-600'}`}>
                          {service.bookings}
                        </td>
                        <td className={`py-3 px-4 text-right font-semibold ${service.revenue === 0 ? 'text-red-500' : 'text-green-600'}`}>
                          Rp {service.revenue.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td colSpan={2} className="py-3 px-4">Total</td>
                      <td className="py-3 px-4 text-center">{serviceReports.reduce((sum, s) => sum + s.bookings, 0)}</td>
                      <td className="py-3 px-4 text-right text-green-600">
                        Rp {serviceReports.reduce((sum, s) => sum + s.revenue, 0).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Barbers Table */}
          {reportType === 'barbers' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Laporan Barber</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">#</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Nama Barber</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Appointments</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">Revenue</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {barberReports.map((barber, index) => (
                      <tr key={barber.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">{index + 1}</td>
                        <td className="py-3 px-4 font-medium text-gray-800">{barber.name}</td>
                        <td className={`py-3 px-4 text-center ${barber.appointments === 0 ? 'text-red-500' : 'text-gray-600'}`}>
                          {barber.appointments}
                        </td>
                        <td className={`py-3 px-4 text-right font-semibold ${barber.revenue === 0 ? 'text-red-500' : 'text-green-600'}`}>
                          Rp {barber.revenue.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {barber.rating > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-yellow-500">★</span>
                              {barber.rating.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td colSpan={2} className="py-3 px-4">Total</td>
                      <td className="py-3 px-4 text-center">{barberReports.reduce((sum, b) => sum + b.appointments, 0)}</td>
                      <td className="py-3 px-4 text-right text-green-600">
                        Rp {barberReports.reduce((sum, b) => sum + b.revenue, 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {barberReports.filter(b => b.rating > 0).length > 0 
                          ? (barberReports.reduce((sum, b) => sum + b.rating, 0) / barberReports.filter(b => b.rating > 0).length).toFixed(1)
                          : '-'
                        }
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
