// Vercel Edge Function - Alternative to Firebase Functions
// Deploy ini ke Vercel (free tier)

import { NextRequest } from 'next/server'

export const config = {
  runtime: 'edge',
}

const BIGMODEL_API_KEY = process.env.BIGMODEL_API_KEY

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { messages } = await req.json()

    // Call BigModel API
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BIGMODEL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'glm-4.6',
        messages,
        temperature: 0.7,
        top_p: 0.9,
      }),
    })

    const data = await response.json()
    
    return new Response(JSON.stringify({
      message: data.choices[0]?.message?.content || 'Error',
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
