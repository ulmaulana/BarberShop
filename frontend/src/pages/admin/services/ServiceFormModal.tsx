import { useState, useEffect } from 'react'
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { adminFirestore } from '../../../config/firebaseAdmin'
import { useToast } from '../../../contexts/ToastContext'
import { CloudinaryImageUpload } from '../../../components/common/CloudinaryImageUpload'

interface Service {
  id: string
  name: string
  description: string
  category: string
  price: number
  duration: number
  imageUrl?: string
  isActive: boolean
}

interface Props {
  service: Service | null
  onClose: () => void
}

export function ServiceFormModal({ service, onClose }: Props) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'haircut',
    price: 0,
    duration: 30,
    imageUrl: '',
    isActive: true,
  })
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  
  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description,
        category: service.category,
        price: service.price,
        duration: service.duration,
        imageUrl: service.imageUrl || '',
        isActive: service.isActive,
      })
    }
  }, [service])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.name.trim()) {
      showToast('Service name is required', 'error')
      return
    }
    
    if (!formData.description.trim()) {
      showToast('Description is required', 'error')
      return
    }
    
    if (formData.price < 10000) {
      showToast('Price must be at least Rp 10.000', 'error')
      return
    }
    
    if (formData.duration < 15) {
      showToast('Duration must be at least 15 minutes', 'error')
      return
    }
    
    try {
      setLoading(true)
      
      const serviceData = {
        ...formData,
        updatedAt: serverTimestamp(),
      }
      
      if (service) {
        // Update existing service
        await updateDoc(doc(adminFirestore, 'services', service.id), serviceData)
        showToast('Service updated successfully', 'success')
      } else {
        // Create new service
        await addDoc(collection(adminFirestore, 'services'), {
          ...serviceData,
          totalBookings: 0,
          createdAt: serverTimestamp(),
        })
        showToast('Service created successfully', 'success')
      }
      
      onClose()
    } catch (error) {
      console.error('Failed to save service:', error)
      showToast('Failed to save service', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  const handleImageChange = (urls: string[]) => {
    setFormData(prev => ({ ...prev, imageUrl: urls[0] || '' }))
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">
            {service ? 'Edit Service' : 'Add New Service'}
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
          {/* Service Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. Haircut Premium"
              maxLength={100}
            />
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Describe the service..."
              maxLength={500}
            />
          </div>
          
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="haircut">Haircut</option>
              <option value="styling">Styling</option>
              <option value="treatment">Treatment</option>
              <option value="package">Package</option>
            </select>
          </div>
          
          {/* Price & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="10000"
                step="5000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes) <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
                <option value={120}>120 minutes</option>
                <option value={150}>150 minutes</option>
                <option value={180}>180 minutes</option>
              </select>
            </div>
          </div>
          
          {/* Service Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Image <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <CloudinaryImageUpload
              maxFiles={1}
              currentImages={formData.imageUrl ? [formData.imageUrl] : []}
              onUploadComplete={handleImageChange}
              folder="sahala_barber/services"
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
              Active (visible to customers)
            </label>
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : service ? 'Update Service' : 'Create Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
