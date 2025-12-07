// Skeleton base component
const Skeleton = ({ className = '', style }: { className?: string; style?: React.CSSProperties }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} style={style} />
)

// Card skeleton
export const CardSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <Skeleton className="h-4 w-24 mb-2" />
    <Skeleton className="h-8 w-32" />
  </div>
)

// Stat card skeleton (for dashboard stats)
export const StatCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-8 w-28 mb-1" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-12 w-12 rounded-full" />
    </div>
  </div>
)

// Table skeleton
export const TableSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="bg-white rounded-lg shadow overflow-hidden">
    {/* Header */}
    <div className="bg-gray-50 px-6 py-4 border-b">
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
    </div>
    {/* Rows */}
    <div className="divide-y">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4">
          <div className="flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, colIndex) => (
              <Skeleton 
                key={colIndex} 
                className={`h-4 flex-1 ${colIndex === 0 ? 'max-w-[40px]' : ''}`} 
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
)

// Chart skeleton
export const ChartSkeleton = ({ height = 300 }: { height?: number }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <Skeleton className="h-5 w-40 mb-4" />
    <div className="flex items-end gap-2" style={{ height }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton 
          key={i} 
          className="flex-1" 
          style={{ height: `${Math.random() * 60 + 40}%` }} 
        />
      ))}
    </div>
  </div>
)

// List item skeleton
export const ListItemSkeleton = () => (
  <div className="flex items-center gap-4 p-4">
    <Skeleton className="h-10 w-10 rounded-full" />
    <div className="flex-1">
      <Skeleton className="h-4 w-32 mb-2" />
      <Skeleton className="h-3 w-24" />
    </div>
    <Skeleton className="h-6 w-16 rounded-full" />
  </div>
)

// Dashboard skeleton
export const DashboardSkeleton = () => (
  <div className="p-6 space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
    
    {/* Stats Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
    
    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>
    
    {/* Table */}
    <TableSkeleton rows={5} cols={5} />
  </div>
)

// Appointments skeleton
export const AppointmentsSkeleton = () => (
  <div className="p-6 space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-40" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
    
    {/* Filters */}
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-10 w-48 rounded-lg" />
      </div>
    </div>
    
    {/* Table */}
    <TableSkeleton rows={8} cols={6} />
  </div>
)

// Products/Services skeleton
export const ProductsSkeleton = () => (
  <div className="p-6 space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-10 w-40 rounded-lg" />
    </div>
    
    {/* Search */}
    <div className="bg-white rounded-lg shadow p-4">
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
    </div>
    
    {/* Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow overflow-hidden">
          <Skeleton className="h-48 w-full" />
          <div className="p-4">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-3" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)

// Financial skeleton
export const FinancialSkeleton = () => (
  <div className="p-6 space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-10 w-40 rounded-lg" />
    </div>
    
    {/* Period selector */}
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-lg" />
        ))}
      </div>
    </div>
    
    {/* Stats */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-40 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
    
    {/* Chart */}
    <ChartSkeleton height={250} />
    
    {/* Tables */}
    <div className="bg-white rounded-lg shadow p-6">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="flex gap-4 mb-4">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
      <TableSkeleton rows={5} cols={5} />
    </div>
  </div>
)

// Reports skeleton
export const ReportsSkeleton = () => (
  <div className="p-6 space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <div>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
    
    {/* Filters */}
    <div className="bg-white rounded-lg shadow p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
    
    {/* Summary cards */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
    
    {/* Chart */}
    <ChartSkeleton height={300} />
  </div>
)

// Barbers skeleton
export const BarbersSkeleton = () => (
  <div className="p-6 space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-10 w-40 rounded-lg" />
    </div>
    
    {/* Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-8 flex-1 rounded" />
            <Skeleton className="h-8 flex-1 rounded" />
          </div>
        </div>
      ))}
    </div>
  </div>
)

// Vouchers skeleton
export const VouchersSkeleton = () => (
  <div className="p-6 space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-10 w-40 rounded-lg" />
    </div>
    
    {/* Table */}
    <TableSkeleton rows={6} cols={6} />
  </div>
)

// Payments skeleton
export const PaymentsSkeleton = () => (
  <div className="p-6 space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
    
    {/* Stats */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
    
    {/* Table */}
    <TableSkeleton rows={8} cols={5} />
  </div>
)
