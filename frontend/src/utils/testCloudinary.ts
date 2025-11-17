/**
 * Test Cloudinary Configuration
 * 
 * Jalankan di browser console untuk test koneksi Cloudinary:
 * 
 * import { testCloudinaryUpload } from './utils/testCloudinary'
 * testCloudinaryUpload()
 */

export async function testCloudinaryUpload() {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  console.log('🧪 Testing Cloudinary Configuration...')
  console.log('Cloud Name:', cloudName)
  console.log('Upload Preset:', uploadPreset)

  if (!cloudName || !uploadPreset) {
    console.error('❌ Missing Cloudinary configuration!')
    console.log('Please check your .env file')
    return
  }

  // Create a test image (1x1 red pixel)
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = 'red'
    ctx.fillRect(0, 0, 1, 1)
  }

  // Convert to blob
  canvas.toBlob(async (blob) => {
    if (!blob) {
      console.error('❌ Failed to create test image')
      return
    }

    const formData = new FormData()
    formData.append('file', blob, 'test.png')
    formData.append('upload_preset', uploadPreset)
    formData.append('folder', 'test')

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`

    console.log('📤 Uploading test image to:', uploadUrl)

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        console.log('✅ Upload successful!')
        console.log('Image URL:', data.secure_url)
        console.log('Public ID:', data.public_id)
        console.log('Full response:', data)
        
        // Test if image is accessible
        const img = new Image()
        img.onload = () => {
          console.log('✅ Image is accessible from CDN')
        }
        img.onerror = () => {
          console.error('❌ Image not accessible from CDN')
        }
        img.src = data.secure_url
      } else {
        console.error('❌ Upload failed!')
        console.error('Status:', response.status)
        console.error('Error:', data.error)
        console.error('Full response:', data)
        
        if (data.error?.message?.includes('preset')) {
          console.log('\n💡 Tip: Upload preset might not exist or not configured as "Unsigned"')
          console.log('   Go to Cloudinary Dashboard > Settings > Upload > Upload presets')
        }
      }
    } catch (error) {
      console.error('❌ Network error:', error)
    }
  }, 'image/png')
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  (window as any).testCloudinaryUpload = testCloudinaryUpload
  console.log('💡 Run testCloudinaryUpload() to test Cloudinary upload')
}
