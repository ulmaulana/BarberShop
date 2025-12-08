// Detect environment: production vs local dev
const IS_PRODUCTION = import.meta.env.PROD
const USE_LOCAL_API = import.meta.env.VITE_USE_LOCAL_API === 'true'
const BIGMODEL_API_KEY = import.meta.env.VITE_BIGMODEL_API_KEY

if (!IS_PRODUCTION && USE_LOCAL_API) {
  console.log('🔧 LOCAL DEV MODE: Direct API calls')
  if (!BIGMODEL_API_KEY) {
    console.warn('⚠️ VITE_BIGMODEL_API_KEY not set in .env')
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

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  message: string
  error?: string
}

class BigModelService {
  private vercelApiUrl = '/api/chat'
  private vercelStreamApiUrl = '/api/stream-chat'
  private directApiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    try {
      // Inject system prompt jika belum ada
      const messagesWithSystem = messages[0]?.role === 'system' 
        ? messages 
        : [{ role: 'system', content: SYSTEM_PROMPT }, ...messages]

      // LOCAL DEV: Direct API call
      if (USE_LOCAL_API && !IS_PRODUCTION) {
        console.log('📡 Direct API call to BigModel with system prompt')
        
        if (!BIGMODEL_API_KEY) {
          throw new Error('VITE_BIGMODEL_API_KEY not configured')
        }

        const response = await fetch(this.directApiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${BIGMODEL_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'glm-4-flash',  // Faster model
            messages: messagesWithSystem,
            temperature: 0.7,
            top_p: 0.9
          })
        })

        if (!response.ok) {
          throw new Error(`BigModel API Error: ${response.status}`)
        }

        const result = await response.json()
        return { 
          message: result.choices[0]?.message?.content || 'Error' 
        }
      }

      // PRODUCTION: Vercel API route
      console.log('🚀 Vercel API route call')
      const response = await fetch(this.vercelApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }
      
      const result = await response.json()
      return { message: result.message || 'Error' }
    } catch (error: any) {
      return { 
        message: 'Terjadi kesalahan', 
        error: error.message 
      }
    }
  }

  async streamChat(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      // Inject system prompt jika belum ada
      const messagesWithSystem = messages[0]?.role === 'system' 
        ? messages 
        : [{ role: 'system', content: SYSTEM_PROMPT }, ...messages]

      // Pilih endpoint berdasarkan environment
      const apiUrl = (USE_LOCAL_API && !IS_PRODUCTION) 
        ? this.directApiUrl 
        : this.vercelStreamApiUrl

      // LOCAL DEV: Direct streaming API call
      if (USE_LOCAL_API && !IS_PRODUCTION) {
        console.log('📡 Direct streaming API call to BigModel with system prompt')
        
        if (!BIGMODEL_API_KEY) {
          throw new Error('VITE_BIGMODEL_API_KEY not configured')
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${BIGMODEL_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'glm-4-flash',  // Faster model
            messages: messagesWithSystem,
            temperature: 0.7,
            top_p: 0.9,
            stream: true
          })
        })

        if (!response.ok) {
          throw new Error(`BigModel API Error: ${response.status}`)
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        if (!reader) throw new Error('No reader')

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n').filter(line => line.trim())
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue
              
              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices[0]?.delta?.content || ''
                if (content) onChunk(content)
              } catch (e) {
                // skip invalid JSON
              }
            }
          }
        }
        onComplete()
        return
      }

      // PRODUCTION: Vercel streaming API route
      console.log('🚀 Vercel streaming API route call')
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No reader')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.trim())
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content || ''
              if (content) onChunk(content)
            } catch (e) {
              // skip invalid JSON
            }
          }
        }
      }
      onComplete()
    } catch (error: any) {
      onError(error.message || 'Error')
    }
  }
}

export const bigModelService = new BigModelService()
