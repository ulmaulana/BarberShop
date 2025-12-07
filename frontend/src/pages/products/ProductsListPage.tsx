import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore'
import { firestore } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { useToast } from '../../contexts/ToastContext'
import { FirebaseService } from '../../services/firebase.service'
import { formatCurrency } from '../../utils/format'
import { handleError } from '../../utils/error'
import type { Product } from '../../types'

const productsService = new FirebaseService('products')

export function ProductsListPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'price-low' | 'price-high'>('name')

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    filterAndSortProducts()
  }, [products, selectedCategory, searchQuery, sortBy])

  const loadProducts = async () => {
    try {
      const data = await productsService.getAll()
      // Filter only active products for customer view
      const activeProducts = (data as Product[]).filter(p => p.isActive !== false)
      setProducts(activeProducts)
    } catch (error) {
      showToast(handleError(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortProducts = () => {
    let filtered = products

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Sort products
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      } else if (sortBy === 'price-low') {
        return a.price - b.price
      } else {
        return b.price - a.price
      }
    })

    setFilteredProducts(sorted)
  }

  const handleAddToCart = async (product: Product, event: React.MouseEvent) => {
    event.preventDefault() // Prevent Link navigation
    
    if (!user) {
      showToast('Silakan login untuk menambahkan ke keranjang', 'error')
      navigate('/login?redirect=/products')
      return
    }

    if (product.stock === 0) {
      showToast('Produk sedang habis', 'error')
      return
    }

    try {
      // Check if item already in cart
      const cartRef = collection(firestore, 'cart')
      const q = query(
        cartRef,
        where('userId', '==', user.uid),
        where('productId', '==', product.id)
      )
      const existingItems = await getDocs(q)

      if (!existingItems.empty) {
        showToast('Produk sudah ada di keranjang', 'info')
        navigate('/cart')
        return
      }

      // Add to cart
      await addDoc(collection(firestore, 'cart'), {
        userId: user.uid,
        productId: product.id,
        quantity: 1,
        addedAt: new Date().toISOString()
      })

      showToast('Berhasil ditambahkan ke keranjang!', 'success')
    } catch (error) {
      console.error('Error adding to cart:', error)
      showToast('Gagal menambahkan ke keranjang', 'error')
    }
  }

  const categories = [
    { value: 'all', label: 'All Products', icon: '🎯' },
    { value: 'shampoo', label: 'Shampoo', icon: '🧴' },
    { value: 'conditioner', label: 'Conditioner', icon: '💧' },
    { value: 'styling', label: 'Styling', icon: '💈' },
    { value: 'tools', label: 'Tools', icon: '✂️' },
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
          <h1 className="text-4xl sm:text-5xl font-light text-slate-900 mb-4 tracking-tight">Shop Products</h1>
          <p className="text-lg text-slate-600">Produk perawatan rambut berkualitas premium</p>
        </div>

        {/* Search & Filters */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search Bar */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white text-slate-900 placeholder-slate-400"
              />
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-5 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white text-slate-900"
            >
              <option value="name">Sort by Name</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
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
          Showing <span className="font-medium text-slate-900">{filteredProducts.length}</span> of {products.length} products
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 border border-slate-200 rounded-3xl">
            <h3 className="text-xl font-medium text-slate-900 mb-2">
              No products found
            </h3>
            <p className="text-slate-600">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="group"
                >
                  <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl transition-all overflow-hidden h-full flex flex-col">
                    {/* Product Image */}
                    <div className="relative h-64 bg-slate-100 overflow-hidden">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/500x500?text=No+Image'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-100"></div>
                      )}

                      {/* Stock Badges */}
                      {product.stock === 0 ? (
                        <div className="absolute top-4 right-4 px-3 py-1 bg-slate-900 text-white text-xs font-medium uppercase tracking-wide rounded-full">
                          OUT OF STOCK
                        </div>
                      ) : product.stock < product.lowStockThreshold ? (
                        <div className="absolute top-4 right-4 px-3 py-1 bg-amber-500 text-white text-xs font-medium uppercase tracking-wide rounded-full">
                          LOW STOCK
                        </div>
                      ) : null}
                    </div>

                    {/* Product Info */}
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="text-base font-medium text-slate-900 mb-2 line-clamp-2 min-h-[3rem]">
                        {product.name}
                      </h3>
                      
                      <p className="text-sm text-slate-600 mb-4 line-clamp-2 flex-1 leading-relaxed">
                        {product.description || 'Premium quality product'}
                      </p>

                      {/* Price & Stock */}
                      <div className="flex items-baseline justify-between mb-4">
                        <div>
                          <p className="text-xl font-light text-slate-900">
                            {formatCurrency(product.price)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 uppercase tracking-wide">Stock</p>
                          <p className="text-base font-medium text-slate-900">
                            {product.stock}
                          </p>
                        </div>
                      </div>

                      {/* Rating (if available) */}
                      <div className="flex items-center gap-1.5 mb-4 text-sm">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={i < 4 ? "text-slate-900" : "text-slate-300"}>★</span>
                          ))}
                        </div>
                        <span className="text-slate-500">(35)</span>
                      </div>

                      {/* Add to Cart Button */}
                      <button
                        onClick={(e) => handleAddToCart(product, e)}
                        disabled={product.stock === 0}
                        className={`w-full py-2.5 rounded-2xl font-medium transition-all ${
                          product.stock === 0
                            ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
