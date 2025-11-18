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
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-3xl">
            <div className="inline-block px-4 py-1.5 bg-slate-900 text-white text-sm font-medium rounded-full mb-6">
              Professional Barber
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-light text-slate-900 mb-6 tracking-tight leading-tight">
              Crafting Your
              <span className="block font-semibold">Best Look</span>
            </h1>
            <p className="text-lg text-slate-600 mb-10 leading-relaxed max-w-2xl">
              Layanan potong rambut profesional dengan pengalaman booking yang seamless. 
              Tingkatkan kepercayaan diri Anda dengan sentuhan ahli.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/booking"
                className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-2xl transition-all"
              >
                Book Appointment
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-2xl transition-all"
              >
                View Services
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Our Services Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-16">
            <div>
              <h2 className="text-3xl sm:text-4xl font-light text-slate-900 mb-3 tracking-tight">
                Our Services
              </h2>
              <p className="text-slate-600">Layanan profesional untuk penampilan terbaik Anda</p>
            </div>
            <Link
              to="/services"
              className="text-slate-900 hover:text-slate-700 font-medium flex items-center gap-2 group"
            >
              View All 
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-slate-500">Loading services...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl transition-all overflow-hidden group"
                >
                  {/* Service Image */}
                  <div className="h-56 bg-slate-100 flex items-center justify-center overflow-hidden">
                    {service.imageUrl ? (
                      <img
                        src={service.imageUrl}
                        alt={service.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100"></div>
                    )}
                  </div>

                  {/* Service Info */}
                  <div className="p-6">
                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium uppercase tracking-wide rounded-full mb-4">
                      {service.category}
                    </span>
                    <h3 className="text-xl font-medium text-slate-900 mb-4">
                      {service.name}
                    </h3>
                    <div className="flex items-baseline justify-between mb-6 pb-6 border-b border-slate-100">
                      <span className="text-2xl font-light text-slate-900">
                        Rp {service.price.toLocaleString('id-ID')}
                      </span>
                      <span className="text-sm text-slate-500">
                        {service.duration} min
                      </span>
                    </div>
                    <Link
                      to="/booking"
                      className="block w-full text-center px-4 py-3 bg-slate-900 text-white font-medium hover:bg-slate-800 rounded-2xl transition-all"
                    >
                      Book Now
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && services.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No services available at the moment
            </div>
          )}
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-16">
            <div>
              <h2 className="text-3xl sm:text-4xl font-light text-slate-900 mb-3 tracking-tight">
                Featured Products
              </h2>
              <p className="text-slate-600">Produk perawatan rambut berkualitas premium</p>
            </div>
            <Link
              to="/products"
              className="text-slate-900 hover:text-slate-700 font-medium flex items-center gap-2 group"
            >
              Shop All 
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-slate-500">Loading products...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl transition-all overflow-hidden group"
                >
                  {/* Product Image */}
                  <div className="h-56 bg-slate-100 flex items-center justify-center overflow-hidden">
                    {product.images && product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100"></div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-5">
                    <h3 className="text-base font-medium text-slate-900 mb-3 line-clamp-2 min-h-[3rem]">
                      {product.name}
                    </h3>
                    <div className="mb-4">
                      <span className="text-xl font-light text-slate-900">
                        Rp {product.price.toLocaleString('id-ID')}
                      </span>
                    </div>
                    
                    {/* Rating */}
                    {product.rating && product.reviewCount ? (
                      <div className="flex items-center gap-1.5 mb-4 text-sm text-slate-600">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={i < Math.floor(product.rating || 0) ? "text-slate-900" : "text-slate-300"}>★</span>
                          ))}
                        </div>
                        <span className="text-slate-500">({product.reviewCount})</span>
                      </div>
                    ) : (
                      <div className="h-5 mb-4"></div>
                    )}

                    <div className="text-sm text-slate-500 mb-4">
                      {product.stock} in stock
                    </div>

                    <Link
                      to="/products"
                      className="block w-full text-center px-4 py-2.5 bg-slate-900 text-white font-medium hover:bg-slate-800 rounded-2xl transition-all"
                    >
                      Add to Cart
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && products.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No products available at the moment
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-light text-slate-900 mb-4 tracking-tight">
              Why Choose Us
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Kami berkomitmen memberikan pengalaman terbaik untuk setiap pelanggan
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <div className="w-8 h-8 bg-slate-900 rounded-full"></div>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-3">
                Professional Barbers
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Tim barber berpengalaman dan terlatih untuk hasil terbaik
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <div className="w-8 h-8 bg-slate-900 rounded-full"></div>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-3">
                Easy Booking
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Sistem booking online yang mudah dan praktis, tanpa antrian
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <div className="w-8 h-8 bg-slate-900 rounded-full"></div>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-3">
                Premium Products
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Produk perawatan rambut berkualitas tinggi untuk Anda
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-slate-900 text-white border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-light mb-4 tracking-tight">
            Ready for Your Best Look?
          </h2>
          <p className="text-lg text-slate-400 mb-10 leading-relaxed">
            Book your appointment now and experience professional barber service
          </p>
          <Link
            to="/booking"
            className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-slate-900 bg-white hover:bg-slate-100 rounded-2xl transition-all group"
          >
            Book Appointment Now 
            <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="mb-4">
                <span className="text-2xl font-light text-white">Sahala Barber</span>
              </div>
              <p className="text-slate-500 leading-relaxed max-w-md">
                Professional barber service dengan layanan booking online, 
                produk berkualitas, dan pengalaman terbaik untuk Anda.
              </p>
            </div>

            <div>
              <h3 className="text-white font-medium mb-4">Quick Links</h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/services" className="text-slate-500 hover:text-white transition">
                    Services
                  </Link>
                </li>
                <li>
                  <Link to="/products" className="text-slate-500 hover:text-white transition">
                    Products
                  </Link>
                </li>
                <li>
                  <Link to="/booking" className="text-slate-500 hover:text-white transition">
                    Book Appointment
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-medium mb-4">Contact</h3>
              <ul className="space-y-3 text-slate-500">
                <li>Jl. Merdeka No. 123</li>
                <li>+62 812-3456-7890</li>
                <li>info@sahalabarber.com</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-slate-600 text-sm">
              © 2025 Sahala Barber. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <Link to="/about" className="text-slate-600 hover:text-white transition">About</Link>
              <Link to="/contact" className="text-slate-600 hover:text-white transition">Contact</Link>
              <Link to="/privacy" className="text-slate-600 hover:text-white transition">Privacy</Link>
              <Link to="/terms" className="text-slate-600 hover:text-white transition">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
