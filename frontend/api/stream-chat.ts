import type { VercelRequest, VercelResponse } from '@vercel/node'

// ✅ AMAN - process.env di Vercel serverless function (server-side)
const BIGMODEL_API_KEY = process.env.BIGMODEL_API_KEY

// System prompt untuk Vercel production
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
7. Masker - Untuk mengatasi alergi hidung saat dipangkas

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

Ada **Hair Powder**, **Hair Pomade**, **Hair Tonic**, **Hair Color**, **Hair Spray**, **Serum Rambut**, dan **Masker**.

Untuk harga dan ketersediaan stok: <a href=\"https://wa.me/6281312772527\" target=\"_blank\" style=\"color: #25D366; font-weight: bold; text-decoration: none;\">📱 Hubungi Akmal (081312772527)</a>"

Q: "Jam buka kapan?"
A: "Halo! Kami buka **Setiap Hari jam 08.00-20.00 WIB**. 

Tapi kadang libur tidak menentu ya, jadi lebih baik konfirmasi dulu: <a href=\"https://wa.me/6281312772527\" target=\"_blank\" style=\"color: #25D366; font-weight: bold; text-decoration: none;\">📱 Hubungi Akmal (081312772527)</a>"`

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
    
    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    
    // Call BigModel API dengan streaming
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BIGMODEL_API_KEY}`,  // ✅ Hidden dari browser
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
      throw new Error(`BigModel API error: ${response.status}`)
    }
    
    // Stream response ke client
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    
    if (!reader) {
      throw new Error('No response body')
    }
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value, { stream: true })
      res.write(chunk)
    }
    
    res.end()
    
  } catch (error: any) {
    console.error('Stream Chat API Error:', error)
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
    res.end()
  }
}
