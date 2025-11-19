import { useState, useEffect } from 'react'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { firestore } from '../../../config/firebase'
import { useToast } from '../../../contexts/ToastContext'
import { BarberFormModal } from './BarberFormModal'

interface WorkingHours {
  [key: string]: { start: string; end: string; isOpen: boolean }
}

interface Barber {
  id: string
  name: string
  phone: string
  specialization: string
  imageUrl?: string
  workingHours: WorkingHours
  isActive: boolean
  rating?: number
  totalAppointments?: number
  createdAt: string
  updatedAt: string
}

export function BarbersListPage() {
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null)
  const { showToast } = useToast()
  
  useEffect(() => {
    loadBarbers()
  }, [])
  
  const loadBarbers = async () => {
    try {
      setLoading(true)
      const barbersRef = collection(firestore, 'barbers')
      const snapshot = await getDocs(barbersRef)
      
      const barbersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Barber[]
      
      // Sort by createdAt on client side
      barbersData.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA
      })
      
      setBarbers(barbersData)
    } catch (error) {
      console.error('Failed to load barbers:', error)
      showToast('Failed to load barbers', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDelete = async (barber: Barber) => {
    if (!confirm(`Delete barber "${barber.name}"?`)) return
    
    try {
      await deleteDoc(doc(firestore, 'barbers', barber.id))
      showToast('Barber deleted successfully', 'success')
      loadBarbers()
    } catch (error) {
      console.error('Failed to delete barber:', error)
      showToast('Failed to delete barber', 'error')
    }
  }
  
  const handleEdit = (barber: Barber) => {
    setEditingBarber(barber)
    setShowFormModal(true)
  }
  
  const handleAddNew = () => {
    setEditingBarber(null)
    setShowFormModal(true)
  }
  
  const handleModalClose = () => {
    setShowFormModal(false)
    setEditingBarber(null)
    loadBarbers()
  }
  
  // Filter barbers
  const filteredBarbers = barbers.filter(barber => {
    const matchesSearch = barber.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && barber.isActive) ||
      (statusFilter === 'inactive' && !barber.isActive)
    
    return matchesSearch && matchesStatus
  })
  
  // Get working days summary
  const getWorkingDaysSummary = (workingHours: WorkingHours) => {
    const openDays = Object.values(workingHours).filter(day => day.isOpen).length
    return `${openDays}/7 days`
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading barbers...</div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Barbers Management</h1>
          <p className="text-gray-500 mt-1">{filteredBarbers.length} barbers</p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition"
        >
          + Add Barber
        </button>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="🔍 Search barbers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
      
      {/* Barbers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBarbers.map((barber) => (
          <div key={barber.id} className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden">
            {/* Barber Image */}
            <div className="relative h-56 bg-gray-200">
              {barber.imageUrl ? (
                <img
                  src={barber.imageUrl}
                  alt={barber.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-6xl">💈</span>
                </div>
              )}
              
              {/* Status Badge */}
              <div className="absolute top-3 right-3">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  barber.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {barber.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              {/* Rating Badge */}
              {barber.rating && (
                <div className="absolute top-3 left-3 bg-yellow-400 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                  ⭐ {barber.rating.toFixed(1)}
                </div>
              )}
            </div>
            
            {/* Barber Info */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">{barber.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{barber.specialization}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-20 text-gray-500">Phone:</span>
                  <span className="font-medium">{barber.phone}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-20 text-gray-500">Schedule:</span>
                  <span className="font-medium">{getWorkingDaysSummary(barber.workingHours)}</span>
                </div>
                
                {barber.totalAppointments !== undefined && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-20 text-gray-500">Appts:</span>
                    <span className="font-medium">{barber.totalAppointments} total</span>
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(barber)}
                  className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(barber)}
                  className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredBarbers.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg">
          No barbers found
        </div>
      )}
      
      {/* Form Modal */}
      {showFormModal && (
        <BarberFormModal
          barber={editingBarber}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}
