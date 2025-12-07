import { useState, useEffect } from 'react'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { firestore } from '../../../config/firebase'
import { useToast } from '../../../contexts/ToastContext'
import { ServiceFormModal } from './ServiceFormModal'
import { ProductsSkeleton } from '../../../components/admin/SkeletonLoader'


interface Service {
  id: string
  name: string
  description: string
  category: string
  price: number
  duration: number
  imageUrl?: string
  isActive: boolean
  totalBookings?: number
  createdAt: string
  updatedAt: string
}

export function ServicesListPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const { showToast } = useToast()
  
  useEffect(() => {
    loadServices()
  }, [])
  
  const loadServices = async () => {
    try {
      setLoading(true)
      const servicesRef = collection(firestore, 'services')
      const snapshot = await getDocs(servicesRef)
      
      const servicesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Service[]
      
      // Sort by createdAt on client side
      servicesData.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA
      })
      
      setServices(servicesData)
    } catch (error) {
      console.error('Failed to load services:', error)
      showToast('Failed to load services', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDelete = async (service: Service) => {
    if (!confirm(`Delete service "${service.name}"?`)) return
    
    try {
      await deleteDoc(doc(firestore, 'services', service.id))
      showToast('Service deleted successfully', 'success')
      loadServices()
    } catch (error) {
      console.error('Failed to delete service:', error)
      showToast('Failed to delete service', 'error')
    }
  }
  
  const handleEdit = (service: Service) => {
    setEditingService(service)
    setShowFormModal(true)
  }
  
  const handleAddNew = () => {
    setEditingService(null)
    setShowFormModal(true)
  }
  
  const handleModalClose = () => {
    setShowFormModal(false)
    setEditingService(null)
    loadServices()
  }
  
  // Filter services
  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && service.isActive) ||
      (statusFilter === 'inactive' && !service.isActive)
    
    return matchesSearch && matchesCategory && matchesStatus
  })
  
  if (loading) {
    return <ProductsSkeleton />
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Manajemen Layanan</h1>
          <p className="text-gray-500 mt-1">{filteredServices.length} layanan</p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition"
        >
          + Tambah Layanan
        </button>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-1">
            <input
              type="text"
              placeholder="🔍 Cari layanan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Semua Kategori</option>
              <option value="haircut">Potong Rambut</option>
              <option value="styling">Styling</option>
              <option value="treatment">Perawatan</option>
              <option value="package">Paket</option>
            </select>
          </div>
          
          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Services Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gambar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Harga
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durasi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredServices.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {service.imageUrl ? (
                      <img
                        src={service.imageUrl}
                        alt={service.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-2xl">
                        ✂️
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{service.name}</div>
                    <div className="text-sm text-gray-500 line-clamp-1">{service.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                      {service.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      Rp {service.price.toLocaleString('id-ID')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{service.duration} menit</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      service.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {service.isActive ? 'Aktif' : 'Tidak Aktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(service)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      ✏️ Ubah
                    </button>
                    <button
                      onClick={() => handleDelete(service)}
                      className="text-red-600 hover:text-red-900"
                    >
                      🗑️ Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredServices.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Tidak ada layanan
          </div>
        )}
      </div>
      
      {/* Form Modal */}
      {showFormModal && (
        <ServiceFormModal
          service={editingService}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}
