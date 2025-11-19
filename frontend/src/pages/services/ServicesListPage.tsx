import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { useToast } from '../../contexts/ToastContext'
import { FirebaseService } from '../../services/firebase.service'
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
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-light text-slate-900 mb-4 tracking-tight">Our Services</h1>
          <p className="text-lg text-slate-600">Layanan profesional untuk penampilan terbaik Anda</p>
        </div>

        {/* Search & Filters */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 mb-8">
          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-5 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-slate-700">Categories:</span>
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === cat.value
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-8 text-sm text-slate-600">
          Showing <span className="font-medium text-slate-900">{filteredServices.length}</span> of {services.length} services
        </div>

        {/* Services Grid */}
        {filteredServices.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 border border-slate-200 rounded-3xl">
            <h3 className="text-xl font-medium text-slate-900 mb-2">
              No services found
            </h3>
            <p className="text-slate-600">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl transition-all overflow-hidden group"
                >
                  {/* Service Image */}
                  <div className="h-56 bg-slate-100 flex items-center justify-center overflow-hidden relative">
                    {(service as any).imageUrl ? (
                      <img
                        src={(service as any).imageUrl}
                        alt={service.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/600x400?text=No+Image'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100"></div>
                    )}
                    
                    {/* Category Badge */}
                    <div className="absolute top-4 left-4 px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium uppercase tracking-wide rounded-full">
                      {service.category}
                    </div>
                  </div>

                  {/* Service Info */}
                  <div className="p-6">
                    <h3 className="text-xl font-medium text-slate-900 mb-3">
                      {service.name}
                    </h3>
                    
                    <p className="text-slate-600 mb-4 line-clamp-2 min-h-[3rem] text-sm leading-relaxed">
                      {service.description || 'Professional service dengan hasil terbaik'}
                    </p>

                    {/* Price & Duration */}
                    <div className="flex items-baseline justify-between mb-6 pb-6 border-b border-slate-100">
                      <div>
                        <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Price</p>
                        <p className="text-2xl font-light text-slate-900">
                          {formatCurrency(service.price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Duration</p>
                        <p className="text-base font-medium text-slate-900">
                          {service.durationMinutes} min
                        </p>
                      </div>
                    </div>

                    {/* Book Button */}
                    <Link
                      to={`/booking?serviceId=${service.id}`}
                      className="block w-full text-center px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 font-medium transition-all"
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
