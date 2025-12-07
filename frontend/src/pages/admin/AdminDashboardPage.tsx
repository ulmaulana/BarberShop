import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { DashboardSkeleton } from '../../components/admin/SkeletonLoader'
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore'
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

interface PeriodComparison {
  currentRevenue: number
  previousRevenue: number
  currentOrders: number
  previousOrders: number
  currentAvgTransaction: number
  previousAvgTransaction: number
  revenueGrowth: number
  ordersGrowth: number
  avgTransactionGrowth: number
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

interface Transaction {
  id: string
  type: 'product' | 'service'
  description: string
  amount: number
  status: string
  date: Date
  customerName?: string
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
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [comparison, setComparison] = useState<PeriodComparison>({
    currentRevenue: 0,
    previousRevenue: 0,
    currentOrders: 0,
    previousOrders: 0,
    currentAvgTransaction: 0,
    previousAvgTransaction: 0,
    revenueGrowth: 0,
    ordersGrowth: 0,
    avgTransactionGrowth: 0,
  })
  const [transactionPage, setTransactionPage] = useState(1)
  const TRANSACTIONS_PER_PAGE = 10
  
  useEffect(() => {
    if (authLoading) return
    
    // Setup realtime listeners
    const ordersRef = collection(adminFirestore, 'orders')
    const appointmentsRef = collection(adminFirestore, 'appointments')
    
    let ordersData: any[] = []
    let appointmentsData: any[] = []
    
    // Cache for services and barbers to avoid repeated fetches
    let servicesCache: Record<string, { name: string; price: number }> = {}
    let barbersCache: Record<string, { name: string }> = {}
    let cacheLoaded = false
    
    // Pre-load cache before starting listeners
    const loadCache = async () => {
      if (cacheLoaded) return
      
      const [servicesSnapshot, barbersSnapshot] = await Promise.all([
        getDocs(collection(adminFirestore, 'services')),
        getDocs(collection(adminFirestore, 'barbers'))
      ])
      
      servicesSnapshot.docs.forEach(doc => {
        servicesCache[doc.id] = { name: doc.data().name || 'Unknown', price: doc.data().price || 0 }
      })
      barbersSnapshot.docs.forEach(doc => {
        barbersCache[doc.id] = { name: doc.data().name || 'Unknown' }
      })
      
      cacheLoaded = true
      console.log('[Realtime] Cached', Object.keys(servicesCache).length, 'services,', Object.keys(barbersCache).length, 'barbers')
    }
    
    const processData = async () => {
      // Wait for cache to be loaded
      if (!cacheLoaded) {
        await loadCache()
      }
      
      console.log('[Realtime] Processing data update...', new Date().toLocaleTimeString())
      
      let totalRevenue = 0
      let totalOrders = 0
      let completedAppointments = 0
      
      // Process orders
      ordersData.forEach((order) => {
        if (order.status === 'completed' || order.status === 'paid') {
          totalRevenue += order.totalAmount || 0
          totalOrders++
        }
      })
      
      // Process appointments using cached service prices
      for (const appointment of appointmentsData) {
        if (appointment.status === 'completed') {
          completedAppointments++
          if (appointment.serviceId && servicesCache[appointment.serviceId]) {
            totalRevenue += servicesCache[appointment.serviceId].price
          }
        }
      }
      
      // Pending payments
      const pendingCount = ordersData.filter(o => o.status === 'pending_payment').length
      const totalTransactions = totalOrders + completedAppointments
      
      // Calculate Top Products
      const productStats: Record<string, { name: string; sold: number; revenue: number }> = {}
      ordersData.forEach((order) => {
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
      
      const topProductsList = Object.entries(productStats)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3)
      
      // Calculate Top Services using cache
      const serviceStats: Record<string, { name: string; bookings: number; revenue: number }> = {}
      for (const appointment of appointmentsData) {
        if (appointment.status === 'completed' && appointment.serviceId) {
          const cached = servicesCache[appointment.serviceId]
          if (cached) {
            if (!serviceStats[appointment.serviceId]) {
              serviceStats[appointment.serviceId] = {
                name: cached.name,
                bookings: 0,
                revenue: 0
              }
            }
            serviceStats[appointment.serviceId].bookings += 1
            serviceStats[appointment.serviceId].revenue += cached.price
          }
        }
      }
      
      const topServicesList = Object.entries(serviceStats)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3)
      
      // Calculate Top Barbers using cache
      const barberStats: Record<string, { name: string; appointments: number; revenue: number; totalRating: number; ratingCount: number }> = {}
      for (const appointment of appointmentsData) {
        if (appointment.status === 'completed' && appointment.barberId) {
          const barberCached = barbersCache[appointment.barberId]
          if (barberCached) {
            if (!barberStats[appointment.barberId]) {
              barberStats[appointment.barberId] = {
                name: barberCached.name,
                appointments: 0,
                revenue: 0,
                totalRating: 0,
                ratingCount: 0
              }
            }
            barberStats[appointment.barberId].appointments += 1
            
            if (appointment.serviceId && servicesCache[appointment.serviceId]) {
              barberStats[appointment.barberId].revenue += servicesCache[appointment.serviceId].price
            }
            
            if (appointment.rating) {
              barberStats[appointment.barberId].totalRating += appointment.rating
              barberStats[appointment.barberId].ratingCount += 1
            }
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
      const thirtyDaysAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000) // 29 days ago + today = 30 days
      
      // Initialize 30 days including today
      for (let i = 0; i < 30; i++) {
        const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
        const dateKey = date.toISOString().split('T')[0]
        dailyRevenue[dateKey] = 0
      }
      
      // Also ensure today is included
      const todayKey = today.toISOString().split('T')[0]
      if (dailyRevenue[todayKey] === undefined) {
        dailyRevenue[todayKey] = 0
      }
      
      console.log('[Revenue Trend] Date range:', Object.keys(dailyRevenue).sort())
      
      ordersData.forEach((order) => {
        if (order.status === 'completed' || order.status === 'paid') {
          const orderDate = order.createdAt?.toDate?.() || new Date(order.createdAt)
          const dateKey = orderDate.toISOString().split('T')[0]
          console.log('[Revenue Trend] Order:', order.id, 'date:', dateKey, 'amount:', order.totalAmount, 'in range:', dailyRevenue[dateKey] !== undefined)
          if (dailyRevenue[dateKey] !== undefined) {
            dailyRevenue[dateKey] += order.totalAmount || 0
          }
        }
      })
      
      for (const appointment of appointmentsData) {
        if (appointment.status === 'completed' && appointment.serviceId) {
          const cached = servicesCache[appointment.serviceId]
          if (cached) {
            // Use appointment.date (when service was done) instead of createdAt
            const appointmentDate = appointment.date 
              ? new Date(appointment.date) 
              : (appointment.createdAt?.toDate?.() || new Date(appointment.createdAt))
            const dateKey = appointmentDate.toISOString().split('T')[0]
            console.log('[Revenue Trend] Appointment:', appointment.id, 'date:', dateKey, 'price:', cached.price, 'in range:', dailyRevenue[dateKey] !== undefined)
            if (dailyRevenue[dateKey] !== undefined) {
              dailyRevenue[dateKey] += cached.price
            }
          }
        }
      }
      
      console.log('[Revenue Trend] Final data:', dailyRevenue)
      
      const revenueChartData = Object.entries(dailyRevenue)
        .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
        .map(([date, revenue]) => ({
          date: new Date(date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
          revenue
        }))
      
      // Calculate Period Comparison (Current 30 days vs Previous 30 days)
      const now = new Date()
      const currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const previousPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      const previousPeriodEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      let currentRevenue = 0
      let currentOrdersCount = 0
      let previousRevenue = 0
      let previousOrdersCount = 0
      
      // Calculate orders for both periods
      ordersData.forEach((order) => {
        if (order.status === 'completed' || order.status === 'paid') {
          const orderDate = order.createdAt?.toDate?.() || new Date(order.createdAt)
          const amount = order.totalAmount || 0
          
          if (orderDate >= currentPeriodStart && orderDate <= now) {
            currentRevenue += amount
            currentOrdersCount++
          } else if (orderDate >= previousPeriodStart && orderDate < previousPeriodEnd) {
            previousRevenue += amount
            previousOrdersCount++
          }
        }
      })
      
      // Calculate appointments for both periods using cache
      for (const appointment of appointmentsData) {
        if (appointment.status === 'completed' && appointment.serviceId) {
          // Use appointment.date (when service was done) instead of createdAt
          const appointmentDate = appointment.date 
            ? new Date(appointment.date) 
            : (appointment.createdAt?.toDate?.() || new Date(appointment.createdAt))
          const cached = servicesCache[appointment.serviceId]
          
          if (cached) {
            if (appointmentDate >= currentPeriodStart && appointmentDate <= now) {
              currentRevenue += cached.price
              currentOrdersCount++
            } else if (appointmentDate >= previousPeriodStart && appointmentDate < previousPeriodEnd) {
              previousRevenue += cached.price
              previousOrdersCount++
            }
          }
        }
      }
      
      // Calculate growth rates
      const revenueGrowth = previousRevenue > 0 
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
        : currentRevenue > 0 ? 100 : 0
      
      const ordersGrowth = previousOrdersCount > 0 
        ? ((currentOrdersCount - previousOrdersCount) / previousOrdersCount) * 100 
        : currentOrdersCount > 0 ? 100 : 0
      
      const currentAvgTransaction = currentOrdersCount > 0 ? currentRevenue / currentOrdersCount : 0
      const previousAvgTransaction = previousOrdersCount > 0 ? previousRevenue / previousOrdersCount : 0
      const avgTransactionGrowth = previousAvgTransaction > 0 
        ? ((currentAvgTransaction - previousAvgTransaction) / previousAvgTransaction) * 100 
        : currentAvgTransaction > 0 ? 100 : 0
      
      setComparison({
        currentRevenue,
        previousRevenue,
        currentOrders: currentOrdersCount,
        previousOrders: previousOrdersCount,
        currentAvgTransaction,
        previousAvgTransaction,
        revenueGrowth,
        ordersGrowth,
        avgTransactionGrowth,
      })
      
      // Update state
      setStats({
        totalRevenue,
        netProfit: totalRevenue * 0.54,
        pendingPayments: pendingCount,
        avgTransaction: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
        totalOrders: totalTransactions,
        totalAppointments: appointmentsData.length,
      })
      
      setTopProducts(topProductsList)
      setTopServices(topServicesList)
      setTopBarbers(topBarbersList)
      setRevenueData(revenueChartData)
      
      // Build Recent Transactions list
      const transactions: Transaction[] = []
      
      // Add product orders
      for (const order of ordersData) {
        const orderDate = order.createdAt?.toDate?.() || new Date(order.createdAt)
        const itemNames = order.items?.map((item: any) => item.productName || item.name).filter(Boolean).join(', ') || 'Product Order'
        
        transactions.push({
          id: order.id,
          type: 'product',
          description: itemNames.length > 40 ? itemNames.substring(0, 40) + '...' : itemNames,
          amount: order.totalAmount || 0,
          status: order.status,
          date: orderDate,
          customerName: order.customerName || order.userName || 'Customer',
        })
      }
      
      // Add service appointments using cache
      for (const appointment of appointmentsData) {
        const appointmentDate = appointment.createdAt?.toDate?.() || new Date(appointment.createdAt)
        const cached = appointment.serviceId ? servicesCache[appointment.serviceId] : null
        
        transactions.push({
          id: appointment.id,
          type: 'service',
          description: cached?.name || 'Service',
          amount: cached?.price || 0,
          status: appointment.status,
          date: appointmentDate,
          customerName: appointment.customerName || appointment.userName || 'Customer',
        })
      }
      
      // Sort by date (newest first) - no limit, pagination handled in UI
      const sortedTransactions = transactions
        .sort((a, b) => b.date.getTime() - a.date.getTime())
      
      setRecentTransactions(sortedTransactions)
      setStatsLoading(false)
    }
    
    // Realtime listener for orders
    const unsubscribeOrders = onSnapshot(ordersRef, (snapshot) => {
      console.log('[Realtime] Orders updated:', snapshot.size)
      ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      processData()
    }, (error) => {
      console.error('Orders listener error:', error)
    })
    
    // Realtime listener for appointments
    const unsubscribeAppointments = onSnapshot(appointmentsRef, (snapshot) => {
      console.log('[Realtime] Appointments updated:', snapshot.size)
      appointmentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      processData()
    }, (error) => {
      console.error('Appointments listener error:', error)
    })
    
    return () => {
      console.log('[Realtime] Cleaning up listeners...')
      unsubscribeOrders()
      unsubscribeAppointments()
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
      const thirtyDaysAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000) // 29 days ago + today = 30 days
      
      // Initialize 30 days including today
      for (let i = 0; i < 30; i++) {
        const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
        const dateKey = date.toISOString().split('T')[0]
        dailyRevenue[dateKey] = 0
      }
      
      // Also ensure today is included
      const todayKey = today.toISOString().split('T')[0]
      if (dailyRevenue[todayKey] === undefined) {
        dailyRevenue[todayKey] = 0
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
              // Use appointment.date (when service was done) instead of createdAt
              const appointmentDate = appointment.date 
                ? new Date(appointment.date) 
                : (appointment.createdAt?.toDate?.() || new Date(appointment.createdAt))
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
    return <DashboardSkeleton />
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
              <p className="text-sm text-gray-500 mb-1">Revenue (30 hari)</p>
              <p className="text-2xl font-bold text-gray-800">
                Rp {comparison.currentRevenue.toLocaleString('id-ID')}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-sm font-medium ${
                  comparison.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {comparison.revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(comparison.revenueGrowth).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-400">vs bulan lalu</span>
              </div>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>
        
        {/* Orders Count */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Transaksi (30 hari)</p>
              <p className="text-2xl font-bold text-gray-800">
                {comparison.currentOrders} orders
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-sm font-medium ${
                  comparison.ordersGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {comparison.ordersGrowth >= 0 ? '↑' : '↓'} {Math.abs(comparison.ordersGrowth).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-400">vs bulan lalu</span>
              </div>
            </div>
            <div className="text-4xl">�</div>
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
                Rp {Math.round(comparison.currentAvgTransaction).toLocaleString('id-ID')}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-sm font-medium ${
                  comparison.avgTransactionGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {comparison.avgTransactionGrowth >= 0 ? '↑' : '↓'} {Math.abs(comparison.avgTransactionGrowth).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-400">vs bulan lalu</span>
              </div>
            </div>
            <div className="text-4xl">🎯</div>
          </div>
        </div>
      </div>
      
      {/* Period Comparison Summary */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">Perbandingan Periode (30 Hari)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-blue-200 text-sm">Periode Sekarang</p>
            <p className="text-2xl font-bold">Rp {comparison.currentRevenue.toLocaleString('id-ID')}</p>
            <p className="text-blue-200 text-sm">{comparison.currentOrders} transaksi</p>
          </div>
          <div>
            <p className="text-blue-200 text-sm">Periode Sebelumnya</p>
            <p className="text-2xl font-bold">Rp {comparison.previousRevenue.toLocaleString('id-ID')}</p>
            <p className="text-blue-200 text-sm">{comparison.previousOrders} transaksi</p>
          </div>
          <div>
            <p className="text-blue-200 text-sm">Pertumbuhan</p>
            <p className={`text-2xl font-bold ${comparison.revenueGrowth >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {comparison.revenueGrowth >= 0 ? '+' : ''}{comparison.revenueGrowth.toFixed(1)}%
            </p>
            <p className="text-blue-200 text-sm">
              {comparison.revenueGrowth >= 0 ? 'Naik' : 'Turun'} Rp {Math.abs(comparison.currentRevenue - comparison.previousRevenue).toLocaleString('id-ID')}
            </p>
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
            <p className="text-sm text-gray-500 mt-1">Last 30 days performance <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">LIVE</span></p>
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
      
      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Transaksi Terbaru
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({recentTransactions.length} total)
            </span>
          </h2>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">LIVE</span>
        </div>
        
        {recentTransactions.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Tipe</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Deskripsi</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Customer</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Jumlah</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions
                    .slice((transactionPage - 1) * TRANSACTIONS_PER_PAGE, transactionPage * TRANSACTIONS_PER_PAGE)
                    .map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          tx.type === 'product' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {tx.type === 'product' ? '📦 Produk' : '✂️ Layanan'}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <p className="text-sm font-medium text-gray-800">{tx.description}</p>
                      </td>
                      <td className="py-3 px-2">
                        <p className="text-sm text-gray-600">{tx.customerName}</p>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          tx.status === 'completed' || tx.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : tx.status === 'pending' || tx.status === 'pending_payment'
                            ? 'bg-yellow-100 text-yellow-700'
                            : tx.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {tx.status === 'completed' ? 'Selesai' 
                            : tx.status === 'paid' ? 'Dibayar'
                            : tx.status === 'pending' ? 'Pending'
                            : tx.status === 'pending_payment' ? 'Menunggu Bayar'
                            : tx.status === 'confirmed' ? 'Dikonfirmasi'
                            : tx.status === 'cancelled' ? 'Dibatalkan'
                            : tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <p className="text-sm font-semibold text-gray-800">
                          Rp {tx.amount.toLocaleString('id-ID')}
                        </p>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <p className="text-xs text-gray-500">
                          {tx.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-xs text-gray-400">
                          {tx.date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {recentTransactions.length > TRANSACTIONS_PER_PAGE && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Menampilkan {((transactionPage - 1) * TRANSACTIONS_PER_PAGE) + 1} - {Math.min(transactionPage * TRANSACTIONS_PER_PAGE, recentTransactions.length)} dari {recentTransactions.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTransactionPage(p => Math.max(1, p - 1))}
                    disabled={transactionPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sebelumnya
                  </button>
                  <span className="text-sm text-gray-600">
                    Halaman {transactionPage} dari {Math.ceil(recentTransactions.length / TRANSACTIONS_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setTransactionPage(p => Math.min(Math.ceil(recentTransactions.length / TRANSACTIONS_PER_PAGE), p + 1))}
                    disabled={transactionPage >= Math.ceil(recentTransactions.length / TRANSACTIONS_PER_PAGE)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>Belum ada transaksi</p>
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
