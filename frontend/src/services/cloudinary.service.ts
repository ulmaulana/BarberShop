const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export interface CloudinaryUploadResult {
  url: string
  publicId: string
  width: number
  height: number
  format: string
}

export class CloudinaryService {
  static async uploadImage(file: File, folder = 'general'): Promise<CloudinaryUploadResult> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    formData.append('folder', folder)

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    )

    if (!response.ok) {
      throw new Error('Gagal mengunggah gambar')
    }

    const data = await response.json()
    return {
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format,
    }
  }

  static async uploadMultiple(files: File[], folder = 'general'): Promise<CloudinaryUploadResult[]> {
    const uploads = files.map((file) => this.uploadImage(file, folder))
    return Promise.all(uploads)
  }

  static getOptimizedUrl(publicId: string, options: {
    width?: number
    height?: number
    quality?: 'auto' | 'low' | 'high'
    format?: 'auto' | 'webp' | 'jpg' | 'png'
  } = {}): string {
    const { width, height, quality = 'auto', format = 'auto' } = options
    let transformations = `q_${quality},f_${format}`
    
    if (width) transformations += `,w_${width}`
    if (height) transformations += `,h_${height},c_fill`
    
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformations}/${publicId}`
  }

  static getThumbnailUrl(publicId: string, size = 200): string {
    return this.getOptimizedUrl(publicId, { width: size, height: size, quality: 'auto' })
  }
}
