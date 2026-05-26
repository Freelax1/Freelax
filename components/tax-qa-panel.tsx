'use client'

import { useState } from 'react'
import { PaperPlaneTilt, CircleNotch, ArrowCounterClockwise } from '@phosphor-icons/react'
import Link from 'next/link'
import Button from '@/components/ui/button'
import Tooltip from '@/components/tooltip'
import Input from '@/components/ui/input'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

const DEFAULT_PROMPTS = [
  'Can I claim my home office?',
  'What is the VAT threshold?',
  'When is my SA deadline?',
]

interface TaxQAPanelProps {
  suggestedPrompts?: string[]
  className?: string
}

/** Inline tax Q&A — used inside the Tax briefing card on /tax */
export default function TaxQAPanel({ suggestedPrompts = DEFAULT_PROMPTS, className }: TaxQAPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(false)

  async function handleSend(question?: string) {
    const q = (question ?? input).trim()
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

  const prompts = suggestedPrompts.slice(0, 4)

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-medium text-text-primary">Ask a follow-up</p>
          <p className="text-xs text-text-secondary mt-0.5">UK tax, VAT, expenses, and Self Assessment</p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary px-2 py-1 rounded-lg hover:bg-surface-sunken transition-colors"
          >
            <ArrowCounterClockwise weight="regular" className="w-3.5 h-3.5" />
            New chat
          </button>
        )}
      </div>

      {messages.length > 0 && (
        <div className="max-h-[240px] overflow-y-auto space-y-2.5 mb-3 pr-0.5">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[90%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'rounded-br-sm bg-brand-primary text-text-on-dark'
                    : 'bg-surface-sunken text-text-secondary rounded-bl-sm'
                }`}
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
      )}

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {prompts.map(q => (
            <button
              key={q}
              type="button"
              onClick={() => handleSend(q)}
              className="text-left text-xs text-forest-700 bg-forest-50 hover:bg-forest-100 border border-forest-200/80 px-3 py-1.5 rounded-lg transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Ask about your numbers…"
          aria-label="Tax question"
          className="flex-1 min-w-0"
        />
        <Tooltip label="Send">
          <Button
            type="button"
            intent="primary"
            size="sm"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading || cooldown}
            className="shrink-0"
          >
            <PaperPlaneTilt weight="regular" className="w-4 h-4" />
          </Button>
        </Tooltip>
      </div>
      <p className="mt-2 text-caption text-text-muted">
        AI estimates only · not professional advice ·{' '}
        <Link href="/terms" className="underline hover:text-text-secondary">Learn more</Link>
      </p>
    </div>
  )
}
