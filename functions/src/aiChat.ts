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
  const currentDay = now.getDay() // 0 = Sunday, 6 = Saturday
  
  let isOpen = false
  let todaySchedule = ''
  
  if (currentDay === 0) {
    // Sunday: 10:00 - 18:00
    isOpen = currentHour >= 10 && currentHour < 18
    todaySchedule = 'Minggu: 10:00 - 18:00'
  } else {
    // Monday-Saturday: 9:00 - 20:00
    isOpen = currentHour >= 9 && currentHour < 20
    todaySchedule = 'Senin-Sabtu: 9:00 - 20:00'
  }
  
  return {
    current_time: now.toLocaleString('id-ID'),
    is_open: isOpen,
    status: isOpen ? 'BUKA' : 'TUTUP',
    schedule: {
      weekday: 'Senin-Sabtu: 9:00 - 20:00',
      sunday: 'Minggu: 10:00 - 18:00'
    },
    today_schedule: todaySchedule
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

// System prompt
const SYSTEM_PROMPT = `You are a helpful AI assistant for Sahala Barber, a barbershop and grooming products store.

Your role:
- Help customers with REAL-TIME information about barbershop services, products, and availability
- Provide accurate product recommendations based on current stock and prices
- Answer questions about appointments, booking, and store policies
- Be friendly, professional, and concise in Indonesian language

IMPORTANT - You have access to these real-time functions:
- get_services: Get current services list with actual prices
- get_products: Get current products with stock and prices
- check_operating_hours: Check if store is open NOW
- get_available_barbers: Get list of active barbers

USE THESE FUNCTIONS when customers ask about:
- "Layanan apa saja?" → Call get_services
- "Produk apa yang tersedia?" → Call get_products
- "Apakah buka sekarang?" → Call check_operating_hours
- "Siapa barbernya?" → Call get_available_barbers

Guidelines:
- Always respond in Indonesian (Bahasa Indonesia)
- Be casual but professional
- Keep responses concise (2-3 paragraphs max)
- USE FUNCTIONS to get real data instead of making assumptions
- Encourage booking appointments through the website
- When showing prices, use format: Rp XXX.XXX

FORMATTING RULES (IMPORTANT):
- Use **bold** for important points, service names, or product names
- Use *italic* for emphasis or tips
- Use bullet points (- or *) for lists
- Use double line breaks for new paragraphs
- Structure your response clearly with proper spacing
- Example format:
  **Layanan Kami:**
  - **Haircut** - Rp 50.000
  - **Beard Trim** - Rp 30.000
  
  *Tip: Booking online lebih cepat!*`

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
    
    // First API call with tools to check for function calls
    const checkPayload = {
      model: 'glm-4.6',
      messages: messagesWithSystem,
      temperature: 0.7,
      top_p: 0.9,
      tools: TOOLS_DEFINITION
    }
    
    const checkResponse = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BIGMODEL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkPayload)
    })
    
    if (!checkResponse.ok) {
      res.write(`data: ${JSON.stringify({ error: `API error: ${checkResponse.status}` })}\n\n`)
      res.end()
      return
    }
    
    const checkResult = await checkResponse.json()
    const firstMessage = checkResult.choices[0].message
    
    // Check if AI wants to call tools
    let finalMessages = messagesWithSystem
    
    if (firstMessage.tool_calls && firstMessage.tool_calls.length > 0) {
      console.log('AI requested tool calls:', firstMessage.tool_calls)
      
      // Execute all tool calls
      const toolResponses = []
      for (const toolCall of firstMessage.tool_calls) {
        const functionName = toolCall.function.name
        const functionArgs = JSON.parse(toolCall.function.arguments || '{}')
        
        try {
          const functionResult = await executeFunction(functionName, functionArgs)
          
          toolResponses.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify(functionResult)
          })
        } catch (error: any) {
          toolResponses.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify({ error: error.message })
          })
        }
      }
      
      // Update messages with tool results
      finalMessages = [
        ...messagesWithSystem,
        firstMessage,
        ...toolResponses
      ]
    }
    
    // Stream final response
    const streamPayload = {
      model: 'glm-4.6',
      messages: finalMessages,
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
    
    // First API call with tools
    const firstPayload = {
      model: 'glm-4.6',
      messages: messagesWithSystem,
      temperature: 0.7,
      top_p: 0.9,
      tools: TOOLS_DEFINITION
    }
    
    const firstResponse = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BIGMODEL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(firstPayload)
    })
    
    if (!firstResponse.ok) {
      throw new functions.https.HttpsError(
        'internal',
        `BigModel API error: ${firstResponse.status}`
      )
    }
    
    const firstResult = await firstResponse.json()
    const firstMessage = firstResult.choices[0].message
    
    // Check if AI wants to call tools
    if (firstMessage.tool_calls && firstMessage.tool_calls.length > 0) {
      console.log('AI requested tool calls:', firstMessage.tool_calls)
      
      // Execute all tool calls
      const toolResponses = []
      for (const toolCall of firstMessage.tool_calls) {
        const functionName = toolCall.function.name
        const functionArgs = JSON.parse(toolCall.function.arguments || '{}')
        
        console.log(`Executing function: ${functionName}`, functionArgs)
        
        try {
          const functionResult = await executeFunction(functionName, functionArgs)
          
          toolResponses.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify(functionResult)
          })
        } catch (error: any) {
          console.error(`Error executing function ${functionName}:`, error)
          toolResponses.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify({ error: error.message })
          })
        }
      }
      
      // Second API call with tool results
      const secondPayload = {
        model: 'glm-4.6',
        messages: [
          ...messagesWithSystem,
          firstMessage,
          ...toolResponses
        ],
        temperature: 0.7,
        top_p: 0.9
      }
      
      const secondResponse = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BIGMODEL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(secondPayload)
      })
      
      if (!secondResponse.ok) {
        throw new functions.https.HttpsError(
          'internal',
          `BigModel API error on second call: ${secondResponse.status}`
        )
      }
      
      const secondResult = await secondResponse.json()
      const finalMessage = secondResult.choices[0].message.content
      
      return {
        message: finalMessage,
        toolCalls: firstMessage.tool_calls.map((tc: any) => tc.function.name)
      }
    } else {
      // No tool calls, return direct response
      return {
        message: firstMessage.content
      }
    }
    
  } catch (error: any) {
    console.error('Chat AI Error:', error)
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to process chat request'
    )
  }
})
