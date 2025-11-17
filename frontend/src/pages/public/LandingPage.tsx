import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import { firestore } from '../../config/firebase'

interface Service {
  id: string
  name: string
  price: number
  duration: number
  imageUrl?: string
  category: string
  isActive: boolean
}

interface Product {
  id: string
  name: string
  price: number
  stock: number
  images?: string[]
  rating?: number
  reviewCount?: number
}

export function LandingPage() {
  const [services, setServices] = useState<Service[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFeaturedData()
  }, [])

  const loadFeaturedData = async () => {
    try {
      setLoading(true)

      // Load top 3 active services
      const servicesRef = collection(firestore, 'services')
      const servicesQuery = query(
        servicesRef,
        where('isActive', '==', true),
        limit(3)
      )
      const servicesSnapshot = await getDocs(servicesQuery)
      const servicesData = servicesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Service[]
      setServices(servicesData)

      // Load top 4 products with stock
      const productsRef = collection(firestore, 'products')
      const productsQuery = query(
        productsRef,
        where('stock', '>', 0),
        limit(4)
      )
      const productsSnapshot = await getDocs(productsQuery)
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[]
      setProducts(productsData)

    } catch (error) {
      console.error('Failed to load featured data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <div className="mb-6">
              <span className="inline-block text-6xl mb-4">💈</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
              Professional Barber Service in Town
            </h1>
            <p className="text-xl sm:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Tingkatkan penampilan Anda dengan layanan potong rambut profesional, 
              produk berkualitas, dan pengalaman booking yang mudah.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/booking"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-yellow-500 hover:bg-yellow-600 rounded-lg transition shadow-lg hover:shadow-xl"
              >
                📅 Book Appointment
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-blue-700 hover:bg-blue-600 rounded-lg transition border-2 border-white"
              >
                View Services
              </Link>
            </div>
          </div>
        </div>
        
        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z" fill="#f9fafb"/>
          </svg>
        </div>
      </section>

      {/* Our Services Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                Our Services
              </h2>
              <p className="text-gray-600">Layanan profesional untuk penampilan terbaik Anda</p>
            </div>
            <Link
              to="/services"
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2"
            >
              View All →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Loading services...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition overflow-hidden group"
                >
                  {/* Service Image */}
                  <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center overflow-hidden">
                    {service.imageUrl ? (
                      <img
                        src={service.imageUrl}
                        alt={service.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                      />
                    ) : (
                      <span className="text-6xl">✂️</span>
                    )}
                  </div>

                  {/* Service Info */}
                  <div className="p-6">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full mb-3">
                      {service.category}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {service.name}
                    </h3>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold text-blue-600">
                        Rp {service.price.toLocaleString('id-ID')}
                      </span>
                      <span className="text-sm text-gray-600">
                        ⏱️ {service.duration} min
                      </span>
                    </div>
                    <Link
                      to="/booking"
                      className="block w-full text-center px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                    >
                      Book Now
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && services.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No services available at the moment
            </div>
          )}
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                Featured Products
              </h2>
              <p className="text-gray-600">Produk perawatan rambut berkualitas premium</p>
            </div>
            <Link
              to="/products"
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2"
            >
              Shop All →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Loading products...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white border border-gray-200 rounded-xl hover:shadow-lg transition overflow-hidden group"
                >
                  {/* Product Image */}
                  <div className="h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
                    {product.images && product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                      />
                    ) : (
                      <span className="text-6xl">📦</span>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {product.name}
                    </h3>
                    <div className="mb-3">
                      <span className="text-xl font-bold text-blue-600">
                        Rp {product.price.toLocaleString('id-ID')}
                      </span>
                    </div>
                    
                    {/* Rating */}
                    {product.rating && product.reviewCount ? (
                      <div className="flex items-center gap-1 mb-3 text-sm text-gray-600">
                        <span className="text-yellow-500">⭐</span>
                        <span className="font-semibold">{product.rating}</span>
                        <span>({product.reviewCount})</span>
                      </div>
                    ) : (
                      <div className="h-5 mb-3"></div>
                    )}

                    <div className="text-sm text-gray-600 mb-4">
                      {product.stock} in stock
                    </div>

                    <Link
                      to="/products"
                      className="block w-full text-center px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition"
                    >
                      Add to Cart 🛒
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && products.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No products available at the moment
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Sahala Barber?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Kami berkomitmen memberikan pengalaman terbaik untuk setiap pelanggan
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="text-5xl mb-4">👨‍💼</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Professional Barbers
              </h3>
              <p className="text-gray-600">
                Tim barber berpengalaman dan terlatih untuk hasil terbaik
              </p>
            </div>

            <div className="text-center p-6">
              <div className="text-5xl mb-4">📱</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Easy Booking
              </h3>
              <p className="text-gray-600">
                Sistem booking online yang mudah dan praktis, tanpa antrian
              </p>
            </div>

            <div className="text-center p-6">
              <div className="text-5xl mb-4">✨</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Premium Products
              </h3>
              <p className="text-gray-600">
                Produk perawatan rambut berkualitas tinggi untuk Anda
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready for Your Best Look?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Book your appointment now and experience professional barber service
          </p>
          <Link
            to="/booking"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-blue-600 bg-white hover:bg-gray-100 rounded-lg transition shadow-lg"
          >
            Book Appointment Now →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-3xl">💈</span>
                <span className="text-2xl font-bold text-white">Sahala Barber</span>
              </div>
              <p className="text-gray-400 mb-4">
                Professional barber service dengan layanan booking online, 
                produk berkualitas, dan pengalaman terbaik untuk Anda.
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/services" className="hover:text-white transition">
                    Services
                  </Link>
                </li>
                <li>
                  <Link to="/products" className="hover:text-white transition">
                    Products
                  </Link>
                </li>
                <li>
                  <Link to="/booking" className="hover:text-white transition">
                    Book Appointment
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li>📍 Jl. Merdeka No. 123</li>
                <li>📞 +62 812-3456-7890</li>
                <li>✉️ info@sahalabarber.com</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500">
            <p>
              © 2025 Sahala Barber | 
              <Link to="/about" className="hover:text-white transition mx-2">About</Link> | 
              <Link to="/contact" className="hover:text-white transition mx-2">Contact</Link> | 
              <Link to="/privacy" className="hover:text-white transition mx-2">Privacy</Link> | 
              <Link to="/terms" className="hover:text-white transition mx-2">Terms</Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
