import { Outlet } from 'react-router-dom'
import { AdminSidebar } from './AdminSidebar'
import { AdminHeader } from './AdminHeader'

export function AdminLayout() {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <AdminSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <AdminHeader />
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
