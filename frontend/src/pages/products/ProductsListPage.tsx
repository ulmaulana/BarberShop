import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
      setProducts(data as Product[])
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
      showToast('Please login to add items to cart', 'error')
      navigate('/login?redirect=/products')
      return
    }

    if (product.stock === 0) {
      showToast('Product is out of stock', 'error')
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
        showToast('Product already in cart', 'info')
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

      showToast('Added to cart successfully!', 'success')
    } catch (error) {
      console.error('Error adding to cart:', error)
      showToast('Failed to add to cart', 'error')
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Shop Products</h1>
          <p className="text-gray-600">Produk perawatan rambut berkualitas premium</p>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Search Bar */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="name">Sort by Name</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Filters:</span>
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
          Showing <span className="font-semibold text-gray-900">{filteredProducts.length}</span> of {products.length} products
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No products found
            </h3>
            <p className="text-gray-600">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  className="group"
                >
                  <div className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden h-full flex flex-col">
                    {/* Product Image */}
                    <div className="relative h-64 bg-gray-100 overflow-hidden">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/500x500?text=No+Image'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-6xl">📦</span>
                        </div>
                      )}

                      {/* Stock Badges */}
                      {product.stock === 0 ? (
                        <div className="absolute top-4 right-4 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
                          OUT OF STOCK
                        </div>
                      ) : product.stock < product.lowStockThreshold ? (
                        <div className="absolute top-4 right-4 px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full shadow-lg">
                          LOW STOCK
                        </div>
                      ) : null}
                    </div>

                    {/* Product Info */}
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 min-h-[3.5rem]">
                        {product.name}
                      </h3>
                      
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-1">
                        {product.description || 'Premium quality product'}
                      </p>

                      {/* Price & Stock */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-2xl font-bold text-blue-600">
                            {formatCurrency(product.price)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Stock</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {product.stock}
                          </p>
                        </div>
                      </div>

                      {/* Rating (if available) */}
                      <div className="flex items-center gap-1 mb-4 text-sm">
                        <span className="text-yellow-500">⭐</span>
                        <span className="font-semibold">4.8</span>
                        <span className="text-gray-500">(35)</span>
                      </div>

                      {/* Add to Cart Button */}
                      <button
                        onClick={(e) => handleAddToCart(product, e)}
                        disabled={product.stock === 0}
                        className={`w-full py-3 rounded-lg font-semibold transition shadow-md ${
                          product.stock === 0
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-yellow-500 text-white hover:bg-yellow-600 hover:shadow-lg'
                        }`}
                      >
                        {product.stock === 0 ? 'Out of Stock' : 'Add to Cart 🛒'}
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
