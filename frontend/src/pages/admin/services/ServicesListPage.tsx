import { useState, useEffect } from 'react'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { firestore } from '../../../config/firebase'
import { useToast } from '../../../contexts/ToastContext'
import { ServiceFormModal } from './ServiceFormModal'

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
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading services...</div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Services Management</h1>
          <p className="text-gray-500 mt-1">{filteredServices.length} services</p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition"
        >
          + Add Service
        </button>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-1">
            <input
              type="text"
              placeholder="🔍 Search services..."
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
              <option value="all">All Categories</option>
              <option value="haircut">Haircut</option>
              <option value="styling">Styling</option>
              <option value="treatment">Treatment</option>
              <option value="package">Package</option>
            </select>
          </div>
          
          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => (
          <div key={service.id} className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden">
            {/* Service Image */}
            <div className="relative h-48 bg-gray-200">
              {service.imageUrl ? (
                <img
                  src={service.imageUrl}
                  alt={service.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-6xl">✂️</span>
                </div>
              )}
              
              {/* Status Badge */}
              <div className="absolute top-3 right-3">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  service.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {service.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            
            {/* Service Info */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{service.name}</h3>
                  <span className="text-xs text-gray-500 uppercase">{service.category}</span>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {service.description}
              </p>
              
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    Rp {service.price.toLocaleString('id-ID')}
                  </div>
                  <div className="text-sm text-gray-500">
                    {service.duration} minutes
                  </div>
                </div>
                
                {service.totalBookings !== undefined && (
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-700">
                      {service.totalBookings}
                    </div>
                    <div className="text-xs text-gray-500">bookings</div>
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(service)}
                  className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(service)}
                  className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredServices.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg">
          No services found
        </div>
      )}
      
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
