'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, X, Send, Loader2, RotateCcw } from 'lucide-react'
import Link from 'next/link'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

export default function TaxQAChat() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(false)

  if (pathname?.startsWith('/settings')) return null

  async function handleSend() {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: q }])
    setLoading(true)
    try {
      const res = await fetch('/api/ai/tax-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', text: data.answer ?? 'Sorry, I could not get an answer.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Something went wrong. Please try again.' }])
    }
    setLoading(false)
    setCooldown(true)
    setTimeout(() => setCooldown(false), 15000)
  }

  function handleReset() {
    setMessages([])
    setInput('')
  }

  return (
    <>
      {/* Floating button — icon by default, expands on hover */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Ask about your tax"
        title="Ask about your tax"
        className="group fixed bottom-6 right-6 z-40 flex items-center bg-slate-900 text-white p-3 hover:pr-4 rounded-full shadow-lg hover:bg-slate-800 transition-all duration-300 ease-out"
      >
        <MessageCircle className="w-5 h-5 shrink-0" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-[160px] group-hover:ml-2 text-sm font-medium transition-all duration-300 ease-out">
          Ask about your tax
        </span>
      </button>

      {/* Chat panel */}
      {open && (
        <aside
          aria-label="Tax Q&A chat"
          className="fixed bottom-20 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={{ width: '360px', maxWidth: '360px', maxHeight: '480px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
            <div>
              <p className="text-sm font-semibold">Tax Q&A</p>
              <p className="text-xs text-white/90">Ask anything about your taxes</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleReset} aria-label="New question" title="New question" className="p-1 hover:bg-blue-700 rounded-lg">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={() => setOpen(false)} aria-label="Close" className="p-1 hover:bg-blue-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ minHeight: '200px', maxHeight: '320px' }}>
            {messages.length === 0 && (
              <div className="text-center py-4">
                <p className="text-3xl mb-2">💬</p>
                <p className="text-sm text-slate-500">Ask me anything about UK freelance tax, VAT, expenses, or Self Assessment.</p>
                <div className="mt-3 space-y-1.5">
                  {['Can I claim my home office?', 'What is the VAT threshold?', 'When is my SA deadline?'].map(q => (
                    <button key={q} onClick={() => { setInput(q) }} className="block w-full text-left text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'rounded-br-sm'
                      : 'bg-slate-100 text-slate-700 rounded-bl-sm'
                  }`}
                  style={m.role === 'user' ? { backgroundColor: '#1D6B35', color: '#FFFFFF' } : undefined}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 px-3 py-2 rounded-2xl rounded-bl-sm">
                  <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-100">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask a tax question..."
                aria-label="Tax question"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading || cooldown}
                aria-label="Send question"
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-1.5 text-center whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 11, color: '#475569' }}>
              AI estimates only · not professional advice ·{' '}
              <Link href="/terms" className="underline hover:text-slate-500">Learn more</Link>
            </p>
          </div>
        </aside>
      )}
    </>
  )
}
