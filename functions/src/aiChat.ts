import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

// Initialize Firestore
const db = admin.firestore()

// Tools definition for AI
const TOOLS_DEFINITION = [
  {
    type: 'function',
    function: {
      name: 'get_services',
      description: 'Get the current list of barbershop services with their prices and durations.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_products',
      description: 'Get the current list of available grooming products with stock and prices. Optionally filter by category.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Product category to filter (optional)',
            enum: ['pomade', 'gel', 'wax', 'shampoo', 'oil', 'all']
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_operating_hours',
      description: 'Get current operating hours and check if the barbershop is open right now.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_available_barbers',
      description: 'Get list of currently active barbers with their specialties and ratings.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  }
]

// Function implementations
async function getServices() {
  const servicesSnapshot = await db.collection('services').get()
  const services = servicesSnapshot.docs.map(doc => {
    const data = doc.data()
    return {
      name: data.name,
      price: data.price,
      duration: data.duration,
      description: data.description
    }
  })
  
  return {
    total: services.length,
    services
  }
}

async function getProducts(category?: string) {
  let query = db.collection('products')
  
  if (category && category !== 'all') {
    query = query.where('category', '==', category)
  }
  
  const productsSnapshot = await query.get()
  const products = productsSnapshot.docs.map(doc => {
    const data = doc.data()
    return {
      name: data.name,
      price: data.price,
      stock: data.stock,
      category: data.category,
      description: data.description
    }
  })
  
  return {
    category: category || 'all',
    total: products.length,
    products
  }
}

async function checkOperatingHours() {
  const now = new Date()
  const currentHour = now.getHours()
  
  // Pangkas Sahala Sariwangi: Setiap Hari 08:00 - 20:00
  const isOpen = currentHour >= 8 && currentHour < 20
  
  return {
    current_time: now.toLocaleString('id-ID', { 
      timeZone: 'Asia/Jakarta',
      dateStyle: 'full',
      timeStyle: 'short'
    }),
    is_open: isOpen,
    status: isOpen ? 'BUKA' : 'TUTUP',
    schedule: 'Setiap Hari: 08:00 - 20:00 WIB',
    note: 'Libur tidak menentu, disesuaikan dengan kondisi. Hubungi 081312772527 untuk konfirmasi.',
    contact: {
      name: 'Akmal',
      phone: '081312772527'
    }
  }
}

async function getAvailableBarbers() {
  const barbersSnapshot = await db.collection('barbers')
    .where('isActive', '==', true)
    .get()
  
  const barbers = barbersSnapshot.docs.map(doc => {
    const data = doc.data()
    return {
      name: data.name,
      specialty: data.specialty,
      experience: data.experience,
      rating: data.rating
    }
  })
  
  return {
    total: barbers.length,
    barbers
  }
}

// Execute function by name
async function executeFunction(functionName: string, args: any): Promise<any> {
  switch (functionName) {
    case 'get_services':
      return await getServices()
    case 'get_products':
      return await getProducts(args.category)
    case 'check_operating_hours':
      return await checkOperatingHours()
    case 'get_available_barbers':
      return await getAvailableBarbers()
    default:
      throw new Error(`Unknown function: ${functionName}`)
  }
}

// OPTIMIZED System prompt dengan harga - FORMAT JELAS
const SYSTEM_PROMPT = `Kamu adalah asisten AI Pangkas Sahala Sariwangi, Tasikmalaya.

INFORMASI BARBERSHOP:
- Alamat: Sariwangi, Kec. Sariwangi, Kab. Tasikmalaya 46465
- Jam Buka: 08.00-20.00 WIB (libur tidak menentu)
- Kontak: Akmal (Owner) 081312772527

DAFTAR HARGA LAYANAN:
1. Pangkas Rambut = Rp15.000
2. Kids Haircut = Rp10.000
3. Hair Wash = Rp10.000
4. Hair Styling = Rp20.000
5. Bleaching Rambut = Rp50.000
6. Cat Rambut = Rp50.000
7. Perming Rambut = Rp70.000

DAFTAR HARGA PRODUK:
1. Masker = Rp3.000
2. Hair Tonic = Rp10.000
3. Hair Color = Rp24.000
4. Hair Powder = Rp30.000
5. Pomade = Rp48.000
6. Hair Spray = Rp60.000
7. Serum Rambut = Rp60.000

ATURAN MENJAWAB:
1. Bahasa Indonesia, ramah, maksimal 3 paragraf
2. Jika ditanya harga, WAJIB sebutkan SEMUA harga dari daftar di atas dengan lengkap
3. Format harga: "Rp15.000" (pakai titik ribuan)
4. Untuk stok produk: arahkan ke Akmal (Owner)
5. Gunakan **bold** untuk nama layanan/produk
6. WAJIB akhiri SETIAP jawaban dengan link WhatsApp berikut (copy persis):

Untuk info lebih lanjut: <a href="https://wa.me/6281312772527" target="_blank" style="color:#25D366;font-weight:bold">WhatsApp Akmal (Owner) - 081312772527</a>`

// Streaming HTTPS Function for real-time responses
export const streamChatWithAI = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'POST')
  res.set('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }
  
  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  
  try {
    const { messages } = req.body
    
    // Get API key from Firebase config
    const BIGMODEL_API_KEY = functions.config().bigmodel?.apikey
    
    if (!BIGMODEL_API_KEY) {
      res.write(`data: ${JSON.stringify({ error: 'API key not configured' })}\n\n`)
      res.end()
      return
    }
    
    // Add system prompt
    const messagesWithSystem = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.filter((m: any) => m.role !== 'system')
    ]
    
    // DIRECT STREAMING - No function calling for faster response
    const streamPayload = {
      model: 'glm-4-flash',  // Faster model
      messages: messagesWithSystem,
      temperature: 0.7,
      top_p: 0.9,
      stream: true
    }
    
    const streamResponse = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BIGMODEL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(streamPayload)
    })
    
    if (!streamResponse.ok) {
      res.write(`data: ${JSON.stringify({ error: `Streaming error: ${streamResponse.status}` })}\n\n`)
      res.end()
      return
    }
    
    // Pipe stream from BigModel API to client
    if (streamResponse.body) {
      const reader = streamResponse.body.getReader()
      const decoder = new TextDecoder()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        res.write(chunk)
      }
    }
    
    res.end()
    
  } catch (error: any) {
    console.error('Stream Chat Error:', error)
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
    res.end()
  }
})

// Main Cloud Function
export const chatWithAI = functions.https.onCall(async (data, context) => {
  try {
    const { messages, stream = false } = data
    
    // Get API key from Firebase config
    const BIGMODEL_API_KEY = functions.config().bigmodel?.apikey
    
    if (!BIGMODEL_API_KEY) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'BigModel API key not configured'
      )
    }
    
    // Add system prompt
    const messagesWithSystem = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.filter((m: any) => m.role !== 'system')
    ]
    
    // DIRECT API CALL - No function calling for faster response
    const payload = {
      model: 'glm-4-flash',  // Faster model
      messages: messagesWithSystem,
      temperature: 0.7,
      top_p: 0.9
      // NO TOOLS - untuk response cepat tanpa database call
    }
    
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BIGMODEL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      throw new functions.https.HttpsError(
        'internal',
        `BigModel API error: ${response.status}`
      )
    }
    
    const result = await response.json()
    const message = result.choices[0].message.content
    
    return {
      message
    }
    
  } catch (error: any) {
    console.error('Chat AI Error:', error)
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to process chat request'
    )
  }
})
