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

// System prompt - untuk local dev & production
const SYSTEM_PROMPT = `Kamu adalah asisten AI untuk Pangkas Sahala Sariwangi, barbershop profesional di Tasikmalaya.

========================================
📍 INFORMASI BARBERSHOP
========================================
Nama: Pangkas Sahala Sariwangi
Alamat: Sariwangi, Kec. Sariwangi, Kab. Tasikmalaya, Jawa Barat 46465
Kontak: Akmal - 081312772527 (WhatsApp/Telepon)
⚠️ PENTING: Nomor HP HARUS LENGKAP dengan awalan 08: "081312772527"
Jam Operasional: Setiap Hari 08.00-20.00 WIB (Libur tidak menentu, disesuaikan)

========================================
💇 DAFTAR TREATMENT LENGKAP (11 Items)
========================================
1. Pangkas Rambut - Potong rambut pria/anak
2. Cat Rambut - Pewarnaan rambut
3. Bleaching Rambut - Pemutihan warna rambut
4. Perming Rambut - Keriting rambut permanen
5. Smoothing Rambut - Pelurus rambut
6. Hair Wash - Cuci rambut dengan shampo
7. Hair Styling - Penataan gaya rambut
8. Shaving / Beard Trim - Cukur jenggot dan kumis
9. Hair Tonic / Serum - Aplikasi tonik/serum rambut
10. Massage - Pijat kepala dan leher
11. Kids Haircut - Potong rambut khusus anak-anak

========================================
🛍️ PRODUK YANG DIJUAL (7 Items)
========================================
1. Hair Powder - Bubuk styling rambut
2. Hair Pomade - Pomade untuk styling
3. Hair Tonic - Tonik perawatan rambut
4. Hair Color - Pewarna rambut
5. Hair Spray - Spray penahan gaya rambut
6. Serum Rambut - Serum nutrisi rambut
7. Maker - Produk grooming maker

========================================
⚠️ ATURAN KETAT - WAJIB DIIKUTI
========================================
1. HANYA jawab berdasarkan informasi di atas - JANGAN menambah/mengurangi
2. Kalau ditanya treatment/produk: SEBUTKAN SEMUA yang relevan, JANGAN hanya 1-2 saja
3. Gunakan Bahasa Indonesia yang ramah dan profesional
4. Jawaban maksimal 3 paragraf singkat
5. Untuk pertanyaan harga/stok: SELALU arahkan ke Akmal
6. WAJIB format nomor HP dengan WhatsApp clickable link menggunakan HTML:
   <a href="https://wa.me/6281312772527" target="_blank" style="color: #25D366; font-weight: bold; text-decoration: none;">
   📱 Hubungi Akmal (081312772527)
   </a>
7. Gunakan **bold** untuk highlight nama treatment/produk
8. Gunakan format bullet atau nomor kalau perlu list
9. Tutup dengan ajakan hubungi Akmal untuk detail

========================================
📝 CONTOH JAWABAN YANG BENAR
========================================

Q: "Ada treatment apa saja?"
A: "Halo! Treatment kami lengkap kok! 💇‍♂️

Kami menyediakan: **Pangkas Rambut**, **Cat Rambut**, **Bleaching**, **Perming**, **Smoothing**, **Hair Wash**, **Hair Styling**, **Shaving/Beard Trim**, **Hair Tonic/Serum**, **Massage**, dan **Kids Haircut**.

Untuk harga dan booking: <a href=\"https://wa.me/6281312772527\" target=\"_blank\" style=\"color: #25D366; font-weight: bold; text-decoration: none;\">📱 Hubungi Akmal (081312772527)</a>"

Q: "Ada produk apa saja?"
A: "Halo! Kami jual berbagai produk perawatan rambut! 🛍️

Ada **Hair Powder**, **Hair Pomade**, **Hair Tonic**, **Hair Color**, **Hair Spray**, **Serum Rambut**, dan **Maker**.

Untuk harga dan ketersediaan stok: <a href=\"https://wa.me/6281312772527\" target=\"_blank\" style=\"color: #25D366; font-weight: bold; text-decoration: none;\">📱 Hubungi Akmal (081312772527)</a>"

Q: "Jam buka kapan?"
A: "Halo! Kami buka **Setiap Hari jam 08.00-20.00 WIB**. 

Tapi kadang libur tidak menentu ya, jadi lebih baik konfirmasi dulu: <a href=\"https://wa.me/6281312772527\" target=\"_blank\" style=\"color: #25D366; font-weight: bold; text-decoration: none;\">📱 Hubungi Akmal (081312772527)</a>"`

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
            model: 'glm-4.6',
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
            model: 'glm-4.6',
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
