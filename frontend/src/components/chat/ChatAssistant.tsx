import { useState, useRef, useEffect } from 'react'
import { bigModelService } from '../../services/bigmodel.service'
import type { ChatMessage } from '../../services/bigmodel.service'
import { parseMarkdown } from '../../utils/markdown'

export function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Halo! Saya asisten virtual Sahala Barber. Ada yang bisa saya bantu? 😊'
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const streamingResponseRef = useRef('')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isStreaming) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim()
    }

    // Add user message
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsStreaming(true)

    // Reset streaming state
    streamingResponseRef.current = ''
    setStreamingContent('')

    // Stream response with throttling
    let lastUpdate = Date.now()
    const updateInterval = 100 // Update UI every 100ms max
    
    await bigModelService.streamChat(
      [...messages, userMessage],
      (chunk: string) => {
        streamingResponseRef.current += chunk
        
        // Throttle UI updates for better performance
        const now = Date.now()
        if (now - lastUpdate > updateInterval) {
          setStreamingContent(streamingResponseRef.current)
          lastUpdate = now
        }
      },
      () => {
        // Final update: add to messages FIRST, then clear streaming state
        const finalContent = streamingResponseRef.current
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: finalContent
        }])
        
        // Clear streaming state AFTER message is added
        setTimeout(() => {
          setIsStreaming(false)
          setStreamingContent('')
          streamingResponseRef.current = ''
        }, 50)
      },
      (error: string) => {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: error 
        }])
        setIsStreaming(false)
        streamingResponseRef.current = ''
        setStreamingContent('')
      }
    )
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const quickQuestions = [
    'Layanan apa saja yang tersedia?',
    'Produk apa yang direkomendasikan?',
    'Jam operasional?'
  ]

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question)
    inputRef.current?.focus()
  }

  return (
    <>
      {/* Chat Button - Mobile Friendly */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50 flex items-center gap-2 sm:gap-3 bg-slate-900 hover:bg-slate-800 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          aria-label="Open chat"
        >
          <div className="relative">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
          </div>
          <span className="font-medium text-xs sm:text-sm">Tanya AI</span>
        </button>
      )}

      {/* Chat Window - Mobile Friendly */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 left-0 sm:bottom-4 sm:right-4 sm:left-auto w-full sm:w-[420px] h-[85vh] sm:h-[650px] max-h-[650px] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col z-50 border-t border-slate-200 sm:border overflow-hidden">
          {/* Header - Responsive */}
          <div className="bg-slate-900 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">💈</span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-slate-900"></span>
              </div>
              <div>
                <h3 className="font-semibold text-base">Tanya AI</h3>
                <p className="text-xs text-slate-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  Online • Siap membantu
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg p-2 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages - Mobile Friendly */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-5 pt-3 sm:pt-4 pb-2 space-y-2.5 bg-gradient-to-b from-slate-50 to-white">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white text-slate-900 shadow-sm border border-slate-100'
                  }`}
                >
                  {message.role === 'user' ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div 
                      className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-h1:my-1 prose-h2:my-1 prose-h3:my-1 prose-h4:my-1 prose-a:text-green-600 prose-a:no-underline hover:prose-a:underline"
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
                    />
                  )}
                </div>
              </div>
            ))}
            
            {isStreaming && streamingContent && (
              <div className="flex justify-start animate-fadeIn">
                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100 max-w-[85%]">
                  <div 
                    className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-h1:my-1 prose-h2:my-1 prose-h3:my-1 prose-h4:my-1 prose-a:text-green-600 prose-a:no-underline hover:prose-a:underline"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(streamingContent) }}
                  />
                  <div className="flex gap-1 mt-2">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            {isStreaming && !streamingContent && (
              <div className="flex justify-start animate-fadeIn">
                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions - Mobile Friendly */}
          {messages.length === 1 && (
            <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-t border-slate-100 bg-white">
              <p className="text-xs font-medium text-slate-500 mb-2">💡 Pertanyaan populer:</p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {quickQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickQuestion(question)}
                    className="text-xs px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-slate-50 text-slate-700 rounded-full hover:bg-slate-100 hover:text-slate-900 transition-all border border-slate-200 hover:border-slate-300"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input - Mobile Friendly */}
          <div className="p-3 sm:p-5 border-t border-slate-100 bg-white">
            <div className="flex gap-2 sm:gap-3 items-end">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Tanyakan sesuatu..."
                rows={1}
                disabled={isStreaming}
                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none disabled:bg-slate-50 disabled:cursor-not-allowed text-sm placeholder:text-slate-400 transition-all"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isStreaming}
                className="px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
