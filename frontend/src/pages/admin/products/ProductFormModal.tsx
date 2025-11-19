import { useState, useEffect } from 'react'
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { adminFirestore } from '../../../config/firebaseAdmin'
import { useToast } from '../../../contexts/ToastContext'
import { CloudinaryImageUpload } from '../../../components/common/CloudinaryImageUpload'
import { formatRupiah, parseRupiah } from '../../../utils/rupiahFormat'

interface Product {
  id: string
  name: string
  description: string
  category: string
  price: number
  costPrice?: number
  stock: number
  minStockThreshold: number
  images: string[]
  sku: string
  isActive: boolean
}

interface Props {
  product: Product | null
  onClose: () => void
}

export function ProductFormModal({ product, onClose }: Props) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'styling',
    price: 0,
    costPrice: 0,
    stock: 0,
    minStockThreshold: 5,
    images: [] as string[],
    sku: '',
    isActive: true,
  })
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
        costPrice: product.costPrice || 0,
        stock: product.stock,
        minStockThreshold: product.minStockThreshold,
        images: product.images || [],
        sku: product.sku,
        isActive: product.isActive,
      })
    }
  }, [product])
  
  const generateSKU = () => {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    return `PROD-${timestamp}-${random}`
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.name.trim()) {
      showToast('Product name is required', 'error')
      return
    }
    
    if (formData.price < 1000) {
      showToast('Price must be at least Rp 1.000', 'error')
      return
    }
    
    if (formData.costPrice && formData.costPrice >= formData.price) {
      showToast('Cost price must be less than selling price', 'error')
      return
    }
    
    if (formData.images.length === 0) {
      showToast('At least 1 image is required', 'error')
      return
    }
    
    try {
      setLoading(true)
      
      const productData = {
        ...formData,
        sku: formData.sku || generateSKU(),
        updatedAt: serverTimestamp(),
      }
      
      if (product) {
        // Update existing product
        await updateDoc(doc(adminFirestore, 'products', product.id), productData)
        showToast('Product updated successfully', 'success')
      } else {
        // Create new product
        await addDoc(collection(adminFirestore, 'products'), {
          ...productData,
          createdAt: serverTimestamp(),
        })
        showToast('Product created successfully', 'success')
      }
      
      onClose()
    } catch (error) {
      console.error('Failed to save product:', error)
      showToast('Failed to save product', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  const handleImagesChange = (urls: string[]) => {
    setFormData(prev => ({ ...prev, images: urls }))
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">
            {product ? 'Edit Produk' : 'Tambah Produk Baru'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Produk <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="cth: Pomade Strong Hold"
              maxLength={100}
            />
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deskripsi
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Deskripsi produk..."
              maxLength={500}
            />
          </div>
          
          {/* Category & SKU */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="shampoo">Shampoo</option>
                <option value="conditioner">Conditioner</option>
                <option value="styling">Styling</option>
                <option value="tools">Alat</option>
                <option value="other">Lainnya</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU (opsional)
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Otomatis dibuat"
              />
            </div>
          </div>
          
          {/* Price & Cost Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Harga Jual (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formatRupiah(formData.price)}
                onChange={(e) => setFormData({ ...formData, price: parseRupiah(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="cth: 50.000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Harga Modal (Rp) <span className="text-gray-400 text-xs">opsional</span>
              </label>
              <input
                type="text"
                value={formatRupiah(formData.costPrice)}
                onChange={(e) => setFormData({ ...formData, costPrice: parseRupiah(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="cth: 30.000"
              />
            </div>
          </div>
          
          {/* Stock & Min Threshold */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jumlah Stok <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                placeholder="cth: 100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batas Peringatan Stok Rendah
              </label>
              <input
                type="number"
                value={formData.minStockThreshold}
                onChange={(e) => setFormData({ ...formData, minStockThreshold: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                placeholder="cth: 10"
              />
            </div>
          </div>
          
          {/* Images Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gambar Produk <span className="text-red-500">*</span>
              <span className="text-gray-400 text-xs ml-2">(Maks 5 gambar)</span>
            </label>
            <CloudinaryImageUpload
              maxFiles={5}
              currentImages={formData.images}
              onUploadComplete={handleImagesChange}
              folder="sahala_barber/products"
            />
          </div>
          
          {/* Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Aktif (terlihat oleh pelanggan)
            </label>
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : product ? 'Update Produk' : 'Buat Produk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
