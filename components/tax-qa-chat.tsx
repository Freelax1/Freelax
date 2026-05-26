'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChatCircle, X, PaperPlaneTilt, CircleNotch, ArrowCounterClockwise } from '@phosphor-icons/react'
import Link from 'next/link'
import Tooltip from '@/components/tooltip'
import { IconButton } from '@/components/ui/icon-button'
import Button from '@/components/ui/button'
import Input from '@/components/ui/input'

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

  if (pathname?.startsWith('/settings') || pathname?.startsWith('/tax')) return null

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
        className="group fixed bottom-6 right-6 z-40 flex items-center bg-brand-primary text-white p-3 hover:pr-4 rounded-full shadow-popover hover:bg-forest-700 transition-all duration-300 ease-out"
      >
        <ChatCircle weight="regular" className="w-5 h-5 shrink-0" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-[160px] group-hover:ml-2 text-sm font-medium transition-all duration-300 ease-out">
          Ask about your tax
        </span>
      </button>

      {/* Chat panel */}
      {open && (
        <aside
          aria-label="Tax Q&A chat"
          className="fixed bottom-20 right-6 z-dropdown bg-surface-card rounded-xl shadow-xl border border-border-default flex flex-col overflow-hidden w-[360px] max-w-[360px] max-h-[480px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-surface-sunken">
            <div>
              <p className="text-sm font-semibold text-text-primary">Tax Q&A</p>
              <p className="text-xs text-text-secondary">Ask anything about your taxes</p>
            </div>
            <div className="flex items-center gap-1">
              <IconButton
                label="New chat"
                onClick={handleReset}
                className="hover:bg-surface-card"
                icon={<ArrowCounterClockwise weight="regular" className="w-4 h-4" />}
              />
              <IconButton
                label="Close"
                onClick={() => setOpen(false)}
                className="hover:bg-surface-card"
                icon={<X weight="regular" className="w-4 h-4" />}
              />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 min-h-[200px] max-h-[320px]">
            {messages.length === 0 && (
              <div className="text-center py-4">
                <p className="text-3xl mb-2">💬</p>
                <p className="text-sm text-text-muted">Ask me anything about UK freelance tax, VAT, expenses, or Self Assessment.</p>
                <div className="mt-3 space-y-1.5">
                  {['Can I claim my home office?', 'What is the VAT threshold?', 'When is my SA deadline?'].map(q => (
                    <button key={q} onClick={() => { setInput(q) }} className="block w-full text-left text-xs text-forest-600 hover:text-forest-700 bg-forest-50 hover:bg-forest-100 px-3 py-1.5 rounded-lg transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'rounded-br-sm'
                      : 'bg-surface-sunken text-text-secondary rounded-bl-sm'
                  }`}
                  style={m.role === 'user' ? { backgroundColor: 'var(--brand-primary)', color: 'var(--text-on-dark)' } : undefined}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-sunken px-3 py-2 rounded-xl rounded-bl-sm">
                  <CircleNotch weight="regular" className="w-4 h-4 text-text-secondary animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border-subtle">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask a tax question..."
                aria-label="Tax question"
                className="flex-1 min-w-0"
              />
              <Tooltip label="Send">
                <Button
                  type="button"
                  intent="primary"
                  size="sm"
                  onClick={handleSend}
                  disabled={!input.trim() || loading || cooldown}
                  className="p-2 rounded-full shrink-0"
                >
                  <PaperPlaneTilt weight="regular" className="w-4 h-4" />
                </Button>
              </Tooltip>
            </div>
            <p className="mt-1.5 text-center whitespace-nowrap overflow-hidden text-ellipsis text-caption text-text-secondary">
              AI estimates only · not professional advice ·{' '}
              <Link href="/terms" className="underline hover:text-text-muted">Learn more</Link>
            </p>
          </div>
        </aside>
      )}
    </>
  )
}
