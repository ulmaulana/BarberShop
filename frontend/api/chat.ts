import type { VercelRequest, VercelResponse } from '@vercel/node'

// ✅ AMAN - process.env di Vercel serverless function (server-side)
const BIGMODEL_API_KEY = process.env.BIGMODEL_API_KEY

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  if (!BIGMODEL_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' })
  }
  
  try {
    const { messages } = req.body
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' })
    }
    
    // Inject system prompt jika belum ada
    const messagesWithSystem = messages[0]?.role === 'system' 
      ? messages 
      : [{ role: 'system', content: SYSTEM_PROMPT }, ...messages]
    
    // Call BigModel API dari server-side
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BIGMODEL_API_KEY}`,  // ✅ Hidden dari browser
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
      throw new Error(`BigModel API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return res.status(200).json({
      message: data.choices[0]?.message?.content || 'No response'
    })
    
  } catch (error: any) {
    console.error('Chat API Error:', error)
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    })
  }
}
