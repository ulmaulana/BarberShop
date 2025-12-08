// Test API Speed - Run: node test-api-speed.js
// Usage: set BIGMODEL_API_KEY=your_key && node test-api-speed.js

const BIGMODEL_API_KEY = process.env.BIGMODEL_API_KEY || process.env.VITE_BIGMODEL_API_KEY || 'YOUR_KEY_HERE'

// Short system prompt untuk testing
const SHORT_SYSTEM_PROMPT = `Asisten Pangkas Sahala Tasikmalaya. Jawab singkat max 2 kalimat. Kontak: Akmal 081312772527.`

// Shorter version
const OPTIMIZED_SYSTEM_PROMPT = `Asisten AI Pangkas Sahala Sariwangi, Tasikmalaya.
Layanan: Pangkas, Cat, Bleaching, Perming, Smoothing, Hair Wash, Styling, Shaving, Tonic, Massage, Kids Cut.
Produk: Hair Powder, Pomade, Tonic, Color, Spray, Serum, Masker.
Jam: 08.00-20.00 WIB (libur tidak menentu).
Kontak: Akmal 081312772527. Jawab singkat, ramah, max 3 paragraf.`

const models = ['glm-4-flash', 'glm-4-flashx', 'glm-4-air', 'glm-4-airx', 'glm-4.6']

async function testModel(model, systemPrompt, promptName) {
  const start = Date.now()
  
  try {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BIGMODEL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Layanan apa saja?' }
        ],
        temperature: 0.7,
        top_p: 0.9
      })
    })

    const data = await response.json()
    const elapsed = Date.now() - start
    
    if (response.ok) {
      const content = data.choices?.[0]?.message?.content || ''
      const tokens = data.usage || {}
      console.log(`\n[${model}] ${promptName}`)
      console.log(`  Time: ${elapsed}ms`)
      console.log(`  Tokens: ${tokens.prompt_tokens || '?'} prompt + ${tokens.completion_tokens || '?'} completion = ${tokens.total_tokens || '?'} total`)
      console.log(`  Response: ${content.substring(0, 100)}...`)
      return { model, elapsed, success: true, tokens }
    } else {
      console.log(`\n[${model}] FAILED: ${data.error?.message || response.status}`)
      return { model, elapsed, success: false }
    }
  } catch (err) {
    const elapsed = Date.now() - start
    console.log(`\n[${model}] ERROR: ${err.message} (${elapsed}ms)`)
    return { model, elapsed, success: false }
  }
}

async function testStreaming(model, systemPrompt) {
  const start = Date.now()
  let firstChunkTime = null
  let totalContent = ''
  
  try {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BIGMODEL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Layanan apa saja?' }
        ],
        temperature: 0.7,
        top_p: 0.9,
        stream: true
      })
    })

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      if (!firstChunkTime) {
        firstChunkTime = Date.now() - start
      }
      
      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(l => l.trim())
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            totalContent += parsed.choices?.[0]?.delta?.content || ''
          } catch {}
        }
      }
    }
    
    const totalTime = Date.now() - start
    console.log(`\n[${model}] STREAMING`)
    console.log(`  First chunk: ${firstChunkTime}ms`)
    console.log(`  Total time: ${totalTime}ms`)
    console.log(`  Response length: ${totalContent.length} chars`)
    return { model, firstChunkTime, totalTime, success: true }
    
  } catch (err) {
    console.log(`\n[${model}] STREAMING ERROR: ${err.message}`)
    return { model, success: false }
  }
}

async function main() {
  console.log('=' .repeat(60))
  console.log('BIGMODEL API SPEED TEST')
  console.log('=' .repeat(60))
  
  if (BIGMODEL_API_KEY === 'YOUR_KEY_HERE') {
    console.log('\nERROR: Set BIGMODEL_API_KEY environment variable first!')
    console.log('Run: set BIGMODEL_API_KEY=your_actual_key && node test-api-speed.js')
    return
  }
  
  const results = []
  
  // Test fastest models only
  const fastModels = ['glm-4-flash', 'glm-4-flashx', 'glm-4-air']
  
  console.log('\n--- NON-STREAMING (Optimized Prompt) ---')
  for (const model of fastModels) {
    const result = await testModel(model, OPTIMIZED_SYSTEM_PROMPT, 'optimized')
    results.push(result)
    await new Promise(r => setTimeout(r, 500)) // Rate limit
  }
  
  console.log('\n--- STREAMING (Optimized Prompt) ---')
  for (const model of fastModels) {
    const result = await testStreaming(model, OPTIMIZED_SYSTEM_PROMPT)
    results.push(result)
    await new Promise(r => setTimeout(r, 500))
  }
  
  // Compare with current model
  console.log('\n--- CURRENT MODEL (glm-4.6) ---')
  await testModel('glm-4.6', OPTIMIZED_SYSTEM_PROMPT, 'optimized')
  await testStreaming('glm-4.6', OPTIMIZED_SYSTEM_PROMPT)
  
  console.log('\n' + '=' .repeat(60))
  console.log('SUMMARY')
  console.log('=' .repeat(60))
  
  const successful = results.filter(r => r.success && r.elapsed)
  successful.sort((a, b) => a.elapsed - b.elapsed)
  
  console.log('\nFastest models (non-streaming):')
  successful.slice(0, 3).forEach((r, i) => {
    console.log(`  ${i+1}. ${r.model}: ${r.elapsed}ms`)
  })
  
  console.log('\nRecommendation: Use glm-4-flash or glm-4-flashx for fastest response')
}

main()
