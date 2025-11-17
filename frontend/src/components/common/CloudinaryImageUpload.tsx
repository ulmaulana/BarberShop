import { useState } from 'react'

interface Props {
  maxFiles: number
  currentImages: string[]
  onUploadComplete: (urls: string[]) => void
  folder: string
}

export function CloudinaryImageUpload({ maxFiles, currentImages, onUploadComplete, folder }: Props) {
  const [uploading, setUploading] = useState(false)
  const [images, setImages] = useState<string[]>(currentImages)
  
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    if (images.length + files.length > maxFiles) {
      alert(`Maximum ${maxFiles} images allowed`)
      return
    }
    
    // Validate file size and type
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('Only JPG, PNG, and WebP formats are allowed')
        return
      }
    }
    
    setUploading(true)
    
    try {
      const uploadedUrls: string[] = []
      
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('upload_preset', uploadPreset)
        formData.append('folder', folder)
        
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: 'POST',
            body: formData,
          }
        )
        
        const data = await response.json()
        
        if (data.secure_url) {
          uploadedUrls.push(data.secure_url)
        }
      }
      
      const newImages = [...images, ...uploadedUrls]
      setImages(newImages)
      onUploadComplete(newImages)
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload images')
    } finally {
      setUploading(false)
    }
  }
  
  const handleRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    setImages(newImages)
    onUploadComplete(newImages)
  }
  
  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newImages = [...images]
    const [movedImage] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, movedImage)
    setImages(newImages)
    onUploadComplete(newImages)
  }
  
  return (
    <div className="space-y-4">
      {/* Current Images */}
      {images.length > 0 && (
        <div className="grid grid-cols-5 gap-4">
          {images.map((url, index) => (
            <div key={url} className="relative group">
              <img
                src={url}
                alt={`Product ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
              />
              
              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                {/* Move Left */}
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => handleReorder(index, index - 1)}
                    className="bg-white text-gray-800 p-2 rounded hover:bg-gray-100"
                    title="Move left"
                  >
                    ←
                  </button>
                )}
                
                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
                  title="Remove"
                >
                  🗑️
                </button>
                
                {/* Move Right */}
                {index < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => handleReorder(index, index + 1)}
                    className="bg-white text-gray-800 p-2 rounded hover:bg-gray-100"
                    title="Move right"
                  >
                    →
                  </button>
                )}
              </div>
              
              {/* Image number badge */}
              <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Upload Button */}
      {images.length < maxFiles && (
        <div>
          <label className="block w-full">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition cursor-pointer">
              {uploading ? (
                <div className="text-gray-500">Uploading...</div>
              ) : (
                <>
                  <div className="text-4xl mb-2">📷</div>
                  <div className="text-sm text-gray-600">
                    Click to upload images ({images.length}/{maxFiles})
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Max 5MB per file • JPG, PNG, WebP
                  </div>
                </>
              )}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      )}
      
      {images.length === 0 && (
        <div className="text-sm text-red-600">
          * At least 1 image is required
        </div>
      )}
    </div>
  )
}
