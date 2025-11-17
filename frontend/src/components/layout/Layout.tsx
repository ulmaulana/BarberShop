import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { useAuth } from '../../contexts/AuthContext'

interface LayoutProps {
  requireSidebar?: boolean
}

export function Layout({ requireSidebar = false }: LayoutProps) {
  const { user } = useAuth()
  const showSidebar = requireSidebar && user

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        {showSidebar && <Sidebar />}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
