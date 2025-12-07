import { useState, useEffect } from 'react'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { adminFirestore } from '../../../config/firebaseAdmin'
import { Link } from 'react-router-dom'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'

interface FinancialStats {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  ordersCount: number
  avgOrderValue: number
}

interface PeriodData {
  income: number
  expenses: number
  profit: number
}

export function FinancialDashboardPage() {
  const { loading: authLoading, user } = useAdminAuth()
  const [stats, setStats] = useState<FinancialStats>({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    ordersCount: 0,
    avgOrderValue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month')
  const [periodData, setPeriodData] = useState<PeriodData>({
    income: 0,
    expenses: 0,
    profit: 0,
  })
  
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
      
      console.log(`[Financial] ========== LOADING DATA ==========`)
      console.log(`[Financial] Period: ${period}`)
      console.log(`[Financial] Date range: ${startDate.toISOString()} - ${endDate.toISOString()}`)
      
      // Load orders with status 'completed' OR 'paid' (income)
      const ordersRef = collection(adminFirestore, 'orders')
      console.log(`[Financial] Fetching orders...`)
      const ordersSnapshot = await getDocs(ordersRef)
      console.log(`[Financial] Total orders in DB: ${ordersSnapshot.size}`)
      
      let totalIncome = 0
      let ordersCount = 0
      let appointmentsIncome = 0
      let appointmentsCount = 0
      
      ordersSnapshot.docs.forEach(orderDoc => {
        const data = orderDoc.data()
        const orderDate = parseDate(data.createdAt)
        
        console.log(`[Financial] Order ${orderDoc.id}: status=${data.status}, date=${orderDate?.toISOString()}, amount=${data.totalAmount}`)
        
        // Only count completed or paid orders within date range
        if ((data.status === 'completed' || data.status === 'paid') && orderDate) {
          const inRange = orderDate >= startDate && orderDate <= endDate
          console.log(`[Financial]   -> Status OK, inRange: ${inRange}`)
          if (inRange) {
            totalIncome += data.totalAmount || 0
            ordersCount++
            console.log(`[Financial]   -> COUNTED: Rp ${(data.totalAmount || 0).toLocaleString('id-ID')}`)
          }
        }
      })
      
      console.log(`[Financial] Orders income: Rp ${totalIncome.toLocaleString('id-ID')} from ${ordersCount} orders`)
      
      // Load completed appointments (service income)
      const appointmentsRef = collection(adminFirestore, 'appointments')
      const appointmentsSnapshot = await getDocs(appointmentsRef)
      
      for (const appointmentDoc of appointmentsSnapshot.docs) {
        const data = appointmentDoc.data()
        // Gunakan field 'date' (tanggal janji) untuk filter, bukan createdAt
        const appointmentDateStr = data.date as string // Format: YYYY-MM-DD
        const appointmentDate = appointmentDateStr ? new Date(appointmentDateStr + 'T00:00:00') : null
        
        if (data.status === 'completed' && appointmentDate) {
          if (appointmentDate >= startDate && appointmentDate <= endDate) {
            // Get service price
            if (data.serviceId) {
              try {
                const serviceDoc = await getDoc(doc(adminFirestore, 'services', data.serviceId))
                if (serviceDoc.exists()) {
                  const servicePrice = serviceDoc.data().price || 0
                  appointmentsIncome += servicePrice
                  appointmentsCount++
                  console.log(`[Financial] Appointment ${appointmentDoc.id}: Rp ${servicePrice.toLocaleString('id-ID')} (${serviceDoc.data().name})`)
                }
              } catch (error) {
                console.error('Error fetching service:', error)
              }
            }
          }
        }
      }
      
      console.log(`[Financial] Appointments income: Rp ${appointmentsIncome.toLocaleString('id-ID')} from ${appointmentsCount} appointments`)
      
      // Total income = orders + appointments
      totalIncome += appointmentsIncome
      const totalTransactions = ordersCount + appointmentsCount
      
      // Load expenses (manual filter untuk handle berbagai format date)
      const expensesRef = collection(adminFirestore, 'expenses')
      const expensesSnapshot = await getDocs(expensesRef)
      
      let totalExpenses = 0
      expensesSnapshot.docs.forEach(expDoc => {
        const data = expDoc.data()
        const expenseDate = parseDate(data.date)
        
        if (expenseDate && expenseDate >= startDate && expenseDate <= endDate) {
          totalExpenses += data.amount || 0
          console.log(`[Financial] Expense ${expDoc.id}: Rp ${(data.amount || 0).toLocaleString('id-ID')} - ${data.description || 'No description'}`)
        }
      })
      
      console.log(`[Financial] Total expenses: Rp ${totalExpenses.toLocaleString('id-ID')}`)
      
      const netProfit = totalIncome - totalExpenses
      const avgOrderValue = totalTransactions > 0 ? totalIncome / totalTransactions : 0
      
      console.log(`[Financial] Summary - Income: Rp ${totalIncome.toLocaleString('id-ID')}, Expenses: Rp ${totalExpenses.toLocaleString('id-ID')}, Profit: Rp ${netProfit.toLocaleString('id-ID')}`)
      console.log(`[Financial] Total transactions: ${totalTransactions} (${ordersCount} orders + ${appointmentsCount} appointments)`)
      
      setStats({
        totalIncome,
        totalExpenses,
        netProfit,
        ordersCount: totalTransactions, // Gunakan total transaksi (orders + appointments)
        avgOrderValue,
      })
      
      setPeriodData({
        income: totalIncome,
        expenses: totalExpenses,
        profit: netProfit,
      })
      
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
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading financial data...</div>
      </div>
    )
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
