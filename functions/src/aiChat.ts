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

// System prompt - OPTIMIZED for fast response
const SYSTEM_PROMPT = `Kamu asisten AI untuk Pangkas Sahala Sariwangi, barbershop profesional di Tasikmalaya.

📍 INFO BARBERSHOP:
Nama: Pangkas Sahala Sariwangi
Alamat: Sariwangi, Kec. Sariwangi, Kab. Tasikmalaya, Jawa Barat 46465
Kontak: Akmal - 081312772527 (WA/Telp)
Jam: Setiap Hari 08.00-20.00 WIB (Libur tidak menentu)

💇 TREATMENT:
1. Pangkas Rambut
2. Cat Rambut
3. Bleaching Rambut
4. Perming Rambut
5. Smoothing Rambut
6. Hair Wash
7. Hair Styling
8. Shaving/Beard Trim
9. Hair Tonic/Serum
10. Massage
11. Kids Haircut

🛍️ PRODUK:
1. Hair Powder
2. Hair Pomade
3. Hair Tonic
4. Hair Color
5. Hair Spray
6. Serum Rambut
7. Maker

RULES:
- Jawab dalam Bahasa Indonesia, friendly tapi profesional
- Concise (2-3 paragraf max)
- Untuk harga/stok: arahkan hubungi Akmal (081312772527)
- Gunakan **bold** untuk highlight penting
- Gunakan line break untuk readability
- Selalu mention kontak Akmal
- Encourage booking online

CONTOH FORMAT JAWABAN:

"Hai! Treatment kami lengkap kok! 💇‍♂️

Ada **Pangkas Rambut, Cat/Bleaching, Smoothing, Perming, Shaving, Massage** dan lainnya.

*Untuk harga detail, hubungi **Akmal di 081312772527** ya!*"`

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
      model: 'glm-4.6',
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
      model: 'glm-4.6',
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
