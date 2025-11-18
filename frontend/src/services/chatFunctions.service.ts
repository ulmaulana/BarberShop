import { collection, getDocs, query, where, limit } from 'firebase/firestore'
import { firestore } from '../config/firebase'

// Define available tools for AI to call (OpenRouter format)
export const chatTools = [
  {
    type: 'function',
    function: {
      name: 'get_services',
      description: 'Get list of available barbershop services with prices and descriptions',
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
      description: 'Get list of available grooming products with prices, stock, and details',
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
      description: 'Get current operating hours and check if store is open now',
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
      description: 'Get list of available barbers with their specialties',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  }
]

// Function implementations
export async function executeFunction(functionName: string, args: any): Promise<string> {
  try {
    switch (functionName) {
      case 'get_services':
        return await getServices()
      
      case 'get_products':
        return await getProducts(args.category || 'all')
      
      case 'check_operating_hours':
        return await checkOperatingHours()
      
      case 'get_available_barbers':
        return await getAvailableBarbers()
      
      default:
        return 'Function not found'
    }
  } catch (error) {
    console.error(`Error executing function ${functionName}:`, error)
    return `Error: Unable to fetch data. Please try again.`
  }
}

// Get services from Firestore
async function getServices(): Promise<string> {
  const servicesRef = collection(firestore, 'services')
  const snapshot = await getDocs(servicesRef)
  
  if (snapshot.empty) {
    return 'No services available at the moment.'
  }
  
  const services = snapshot.docs.map(doc => {
    const data = doc.data()
    return {
      name: data.name,
      price: data.price,
      duration: data.duration,
      description: data.description
    }
  })
  
  return JSON.stringify({
    total: services.length,
    services: services
  }, null, 2)
}

// Get products from Firestore
async function getProducts(category: string): Promise<string> {
  const productsRef = collection(firestore, 'products')
  let q = query(productsRef, limit(20))
  
  if (category !== 'all') {
    q = query(productsRef, where('category', '==', category), limit(20))
  }
  
  const snapshot = await getDocs(q)
  
  if (snapshot.empty) {
    return `No products found${category !== 'all' ? ` in category: ${category}` : ''}.`
  }
  
  const products = snapshot.docs.map(doc => {
    const data = doc.data()
    return {
      name: data.name,
      price: data.price,
      stock: data.stock,
      category: data.category,
      description: data.description
    }
  })
  
  return JSON.stringify({
    category: category,
    total: products.length,
    products: products
  }, null, 2)
}

// Check operating hours
async function checkOperatingHours(): Promise<string> {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday, 6 = Saturday
  const hour = now.getHours()
  
  const schedule = {
    weekday: { open: 9, close: 20, label: 'Senin-Sabtu: 9:00 - 20:00' },
    sunday: { open: 10, close: 18, label: 'Minggu: 10:00 - 18:00' }
  }
  
  let isOpen = false
  let currentSchedule = ''
  
  if (day === 0) { // Sunday
    isOpen = hour >= schedule.sunday.open && hour < schedule.sunday.close
    currentSchedule = schedule.sunday.label
  } else { // Monday-Saturday
    isOpen = hour >= schedule.weekday.open && hour < schedule.weekday.close
    currentSchedule = schedule.weekday.label
  }
  
  return JSON.stringify({
    current_time: now.toLocaleString('id-ID'),
    is_open: isOpen,
    status: isOpen ? 'BUKA' : 'TUTUP',
    schedule: {
      weekday: schedule.weekday.label,
      sunday: schedule.sunday.label
    },
    today_schedule: currentSchedule
  }, null, 2)
}

// Get available barbers
async function getAvailableBarbers(): Promise<string> {
  const barbersRef = collection(firestore, 'barbers')
  const q = query(barbersRef, where('isActive', '==', true))
  const snapshot = await getDocs(q)
  
  if (snapshot.empty) {
    return 'No barbers available at the moment.'
  }
  
  const barbers = snapshot.docs.map(doc => {
    const data = doc.data()
    return {
      name: data.name,
      specialty: data.specialty || 'General',
      experience: data.experience || 'N/A',
      rating: data.rating || 'N/A'
    }
  })
  
  return JSON.stringify({
    total: barbers.length,
    barbers: barbers
  }, null, 2)
}
