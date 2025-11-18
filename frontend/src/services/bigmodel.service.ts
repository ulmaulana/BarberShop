import { httpsCallable } from 'firebase/functions'
import { firebaseFunctions } from '../config/firebase'

const USE_BACKEND_PROXY = import.meta.env.VITE_USE_AI_PROXY === 'true'
const BIGMODEL_API_KEY = import.meta.env.VITE_BIGMODEL_API_KEY
const chatWithAIFunction = httpsCallable(firebaseFunctions, 'chatWithAI')

if (!USE_BACKEND_PROXY && BIGMODEL_API_KEY) {
  console.warn('⚠️ DEVELOPMENT MODE - API key exposed!')
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  message: string
  error?: string
}

class BigModelService {
  private apiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    try {
      if (USE_BACKEND_PROXY) {
        const result = await chatWithAIFunction({ messages })
        const data = result.data as any
        return { message: data.message }
      }

      console.warn('Direct API - development only')
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + BIGMODEL_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'glm-4.6',
          messages,
          temperature: 0.7,
          top_p: 0.9
        })
      })

      if (!response.ok) {
        throw new Error('API Error: ' + response.status)
      }
      
      const result = await response.json()
      return { 
        message: result.choices[0]?.message?.content || 'Error' 
      }
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
      if (USE_BACKEND_PROXY) {
        const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
        const url = 'https://asia-southeast2-' + projectId + '.cloudfunctions.net/streamChatWithAI'
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages })
        })

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
        return
      }

      console.warn('Direct streaming - development only')
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + BIGMODEL_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'glm-4.6',
          messages,
          temperature: 0.7,
          top_p: 0.9,
          stream: true
        })
      })

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
    } catch (error: any) {
      onError(error.message || 'Error')
    }
  }
}

export const bigModelService = new BigModelService()
