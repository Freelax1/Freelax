'use client'

import { useState } from 'react'
import { Sparkle, ArrowCounterClockwise, CircleNotch } from '@phosphor-icons/react'
import Button from '@/components/ui/button'
import AIFlag from '@/components/ai-flag'
import SlideOver from '@/components/slide-over'
import TaxQAPanel from '@/components/tax-qa-panel'
import {
  NARRATIVE_BULLET_SECTIONS,
  parseNarrativeSections,
} from '@/lib/logic/sa-narrative'
import { buildTaxBriefingTeaser, type TaxBriefingTeaserInput } from '@/lib/logic/tax-briefing-teaser'
import Link from 'next/link'
import { ButtonLink } from '@/components/ui/button'
import { TextLinesSkeleton } from '@/components/ui/content-skeletons'

export type TaxBriefingHook = TaxBriefingTeaserInput

function NarrativeBody({ narrative }: { narrative: string }) {
  const sections = parseNarrativeSections(narrative)
  if (!sections.length) {
    return <p className="text-sm text-text-secondary leading-relaxed">{narrative}</p>
  }
  return (
    <div>
      {sections.map(({ header, content }, i) => {
        const isBullet = NARRATIVE_BULLET_SECTIONS.has(header)
        const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
        return (
          <div key={header}>
            {i > 0 && <div className="h-px my-3.5 bg-border-subtle" />}
            <p className="font-semibold mb-1.5 text-text-primary text-sm">{header}</p>
            {isBullet ? (
              <ul className="space-y-1.5 text-sm text-text-secondary">
                {lines.map((l, j) => (
                  <li key={j} className="flex gap-2">
                    <span className="shrink-0 text-text-muted">•</span>
                    <span>{l.replace(/^[-•]\s*/, '')}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-secondary leading-relaxed">{content}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface TaxBriefingCardProps {
  hook: TaxBriefingHook
  narrative: string | null
  loading: boolean
  onGenerate: (force?: boolean) => void
  suggestedPrompts?: string[]
}

export default function TaxBriefingCard({
  hook,
  narrative,
  loading,
  onGenerate,
  suggestedPrompts,
}: TaxBriefingCardProps) {
  const [open, setOpen] = useState(false)
  const teaser = buildTaxBriefingTeaser(hook)

  function handleCheckNow() {
    setOpen(true)
    if (!narrative && !loading) onGenerate()
  }

  return (
    <>
      <div className="rounded-xl border border-cream-300 bg-cream-100 px-5 py-4 flex items-start sm:items-center gap-4 shadow-card">
        <div
          className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-text-on-dark"
          aria-hidden
        >
          <Sparkle weight="regular" className="w-5 h-5" />
        </div>
        <div className="flex flex-1 flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-w-0">
          <p className="text-sm leading-relaxed text-text-primary">{teaser}</p>
          <Button
            type="button"
            intent="primary"
            size="sm"
            onClick={handleCheckNow}
            disabled={loading}
            className="shrink-0 self-start sm:self-center"
          >
          {loading ? (
            <>
              <CircleNotch weight="regular" className="w-3.5 h-3.5 animate-spin" />
              Checking…
            </>
          ) : (
            'Check Now'
          )}
          </Button>
        </div>
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="Tax copilot" width="lg">
        {!hook.hasData ? (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary leading-relaxed">
              Log paid invoices and expenses for this tax year, then run a check. Your copilot uses that data to flag missed claims, set-aside gaps, and filing reminders.
            </p>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/invoices/new" intent="primary" size="sm">
                Add invoice
              </ButtonLink>
              <ButtonLink href="/expenses/new" intent="secondary" size="sm">
                Log expense
              </ButtonLink>
            </div>
          </div>
        ) : loading ? (
          <div className="py-2">
            <TextLinesSkeleton lines={4} />
            <p className="text-xs text-text-muted pt-3">Reviewing your books…</p>
          </div>
        ) : narrative ? (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Sparkle weight="regular" className="w-4 h-4 text-brand-primary shrink-0" />
              <AIFlag />
              <button
                type="button"
                onClick={() => onGenerate(true)}
                title="Refresh"
                className="ml-auto p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-sunken transition-colors"
              >
                <ArrowCounterClockwise weight="regular" className="w-3.5 h-3.5" />
              </button>
            </div>
            <NarrativeBody narrative={narrative} />
            <div className="border-t border-border-subtle mt-6 pt-5">
              <TaxQAPanel suggestedPrompts={suggestedPrompts} />
            </div>
          </>
        ) : (
          <p className="text-sm text-text-secondary">Could not load your briefing. Try again in a moment.</p>
        )}
      </SlideOver>
    </>
  )
}
