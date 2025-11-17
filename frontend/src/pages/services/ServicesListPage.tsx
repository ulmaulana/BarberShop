import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { useToast } from '../../contexts/ToastContext'
import { FirebaseService } from '../../services/firebase.service'
import { CloudinaryService } from '../../services/cloudinary.service'
import { formatCurrency } from '../../utils/format'
import { handleError } from '../../utils/error'
import type { Service } from '../../types'

const servicesService = new FirebaseService('services')

export function ServicesListPage() {
  const { showToast } = useToast()
  const [services, setServices] = useState<Service[]>([])
  const [filteredServices, setFilteredServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadServices()
  }, [])

  useEffect(() => {
    filterServices()
  }, [services, selectedCategory, searchQuery])

  const loadServices = async () => {
    try {
      const data = await servicesService.getAll()
      setServices(data as Service[])
    } catch (error) {
      showToast(handleError(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  const filterServices = () => {
    let filtered = services

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(s => s.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredServices(filtered)
  }

  const categories = [
    { value: 'all', label: 'All', icon: '🎯' },
    { value: 'haircut', label: 'Haircut', icon: '✂️' },
    { value: 'styling', label: 'Styling', icon: '💇' },
    { value: 'coloring', label: 'Coloring', icon: '🎨' },
    { value: 'treatment', label: 'Treatment', icon: '💆' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Our Services</h1>
          <p className="text-gray-600">Layanan profesional untuk penampilan terbaik Anda</p>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          {/* Search Bar */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="🔍 Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Categories:</span>
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-4 text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{filteredServices.length}</span> of {services.length} services
        </div>

        {/* Services Grid */}
        {filteredServices.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No services found
            </h3>
            <p className="text-gray-600">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden group"
                >
                  {/* Service Image */}
                  <div className="h-56 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center overflow-hidden relative">
                    {service.imageUrl ? (
                      <img
                        src={CloudinaryService.getOptimizedUrl(service.imageUrl, { width: 600, height: 400 })}
                        alt={service.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                      />
                    ) : (
                      <span className="text-7xl">✂️</span>
                    )}
                    
                    {/* Category Badge */}
                    <div className="absolute top-4 left-4 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-sm font-semibold text-gray-900 shadow-lg">
                      {service.category}
                    </div>
                  </div>

                  {/* Service Info */}
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      {service.name}
                    </h3>
                    
                    <p className="text-gray-600 mb-4 line-clamp-2 min-h-[3rem]">
                      {service.description || 'Professional service dengan hasil terbaik'}
                    </p>

                    {/* Price & Duration */}
                    <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Price</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(service.price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500 mb-1">Duration</p>
                        <p className="text-lg font-semibold text-gray-900 flex items-center gap-1">
                          <span>⏱️</span>
                          {service.durationMinutes} min
                        </p>
                      </div>
                    </div>

                    {/* Book Button */}
                    <Link
                      to={`/booking?serviceId=${service.id}`}
                      className="block w-full text-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition shadow-md hover:shadow-lg"
                    >
                      Book Now
                    </Link>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
