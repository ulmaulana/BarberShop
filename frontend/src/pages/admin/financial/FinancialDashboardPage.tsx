import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { firestore } from '../../../config/firebase'
import { Link } from 'react-router-dom'

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
    loadFinancialData()
  }, [period])
  
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
  
  const loadFinancialData = async () => {
    try {
      setLoading(true)
      const { startDate, endDate } = getDateRange()
      
      // Load completed orders (income)
      const ordersRef = collection(firestore, 'orders')
      const ordersQuery = query(
        ordersRef,
        where('status', '==', 'completed'),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate))
      )
      const ordersSnapshot = await getDocs(ordersQuery)
      
      let totalIncome = 0
      let ordersCount = 0
      
      ordersSnapshot.docs.forEach(doc => {
        const data = doc.data()
        totalIncome += data.total || 0
        ordersCount++
      })
      
      // Load expenses
      const expensesRef = collection(firestore, 'expenses')
      const expensesQuery = query(
        expensesRef,
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate))
      )
      const expensesSnapshot = await getDocs(expensesQuery)
      
      let totalExpenses = 0
      expensesSnapshot.docs.forEach(doc => {
        const data = doc.data()
        totalExpenses += data.amount || 0
      })
      
      const netProfit = totalIncome - totalExpenses
      const avgOrderValue = ordersCount > 0 ? totalIncome / ordersCount : 0
      
      setStats({
        totalIncome,
        totalExpenses,
        netProfit,
        ordersCount,
        avgOrderValue,
      })
      
      setPeriodData({
        income: totalIncome,
        expenses: totalExpenses,
        profit: netProfit,
      })
      
    } catch (error) {
      console.error('Failed to load financial data:', error)
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
            {stats.ordersCount} completed orders
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
        
        {/* Average Order */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Avg. Order Value</p>
              <p className="text-2xl font-bold text-gray-800">
                Rp {stats.avgOrderValue.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="text-4xl">🎯</div>
          </div>
          <p className="text-sm text-gray-600">
            Per completed order
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
