import { useState, useEffect } from 'react'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { firestore } from '../../../config/firebase'
import { useToast } from '../../../contexts/ToastContext'
import { BarberFormModal } from './BarberFormModal'
import { BarbersSkeleton } from '../../../components/admin/SkeletonLoader'
import {
  Search,
  Plus,
  Filter,
  Edit,
  Trash2,
  Phone,
  Clock,
  Calendar,
  Star,
  Scissors
} from 'lucide-react'

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
    return <BarbersSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Barbers Management</h1>
          <p className="text-gray-500 mt-1">{filteredBarbers.length} barbers registered</p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Barber
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search barbers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white transition-all"
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
          <div key={barber.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition overflow-hidden group">
            {/* Barber Image */}
            <div className="relative h-56 bg-gray-50 flex items-center justify-center">
              {barber.imageUrl ? (
                <img
                  src={barber.imageUrl}
                  alt={barber.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-300">
                  <Scissors className="w-16 h-16 mb-2" />
                  <span className="text-sm font-medium">No Image</span>
                </div>
              )}

              {/* Status Badge */}
              <div className="absolute top-3 right-3">
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border shadow-sm ${barber.isActive
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : 'bg-red-100 text-red-700 border-red-200'
                  }`}>
                  {barber.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Rating Badge */}
              {barber.rating && (
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-gray-900 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1 border border-gray-100">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  {barber.rating.toFixed(1)}
                </div>
              )}
            </div>

            {/* Barber Info */}
            <div className="p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-1">{barber.name}</h3>
              <p className="text-sm text-blue-600 font-medium mb-4 flex items-center gap-1">
                <Scissors className="w-3 h-3" />
                {barber.specialization}
              </p>

              <div className="space-y-2.5 mb-5">
                <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                  <Phone className="w-4 h-4 mr-3 text-gray-400" />
                  <span className="font-medium text-gray-900">{barber.phone}</span>
                </div>

                <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                  <Clock className="w-4 h-4 mr-3 text-gray-400" />
                  <span className="font-medium text-gray-900">{getWorkingDaysSummary(barber.workingHours)}</span>
                </div>

                {barber.totalAppointments !== undefined && (
                  <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                    <Calendar className="w-4 h-4 mr-3 text-gray-400" />
                    <span className="font-medium text-gray-900">{barber.totalAppointments} appointments</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button
                  onClick={() => handleEdit(barber)}
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(barber)}
                  className="flex-1 px-3 py-2 bg-white border border-red-100 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-200 transition text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredBarbers.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Scissors className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No barbers found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
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
