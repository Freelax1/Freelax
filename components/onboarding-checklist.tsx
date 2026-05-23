'use client'

import Link from 'next/link'
import { Check, CaretRight } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface Step {
  label: string
  desc: string
  href: string
  done: boolean
  cta: string
}

interface Props {
  hasClients: boolean
  hasProjects: boolean
  hasInvoices: boolean
  hasExpenses: boolean
  hasProfile: boolean
}

export default function OnboardingChecklist({ hasClients, hasProjects, hasInvoices, hasExpenses, hasProfile }: Props) {
  const steps: Step[] = [
    {
      label: 'Complete your profile',
      desc: 'Add your name and business type so tax calculations are accurate.',
      href: '/settings',
      done: hasProfile,
      cta: 'Go to Settings',
    },
    {
      label: 'Add your first client',
      desc: 'Clients link to invoices and projects — start here.',
      href: '/clients/new',
      done: hasClients,
      cta: 'Add client',
    },
    {
      label: 'Send your first invoice',
      desc: 'Invoices feed your tax estimate and track what you are owed.',
      href: '/invoices/new',
      done: hasInvoices,
      cta: 'New invoice',
    },
    {
      label: 'Log an expense',
      desc: 'Every business cost you log reduces your tax bill.',
      href: '/expenses',
      done: hasExpenses,
      cta: 'Add expense',
    },
    {
      label: 'Create a project',
      desc: 'Track contracts, log day rates, and manage each client engagement in one place.',
      href: '/projects/new',
      done: hasProjects,
      cta: 'Create project',
    },
  ]

  const completedCount = steps.filter(s => s.done).length
  const allDone = completedCount === steps.length

  if (allDone) return null

  return (
    <div id="getting-started" className="bg-surface-card rounded-xl border border-border-default overflow-hidden">
      <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold font-sans text-text-primary">
            Get started with Freelax
          </h2>
          <p className="text-caption mt-0.5 text-text-secondary">
            {completedCount} of {steps.length} complete
          </p>
        </div>
        {/* Progress bar */}
        <div className="w-[100px] h-1.5 rounded-full overflow-hidden bg-surface-sunken">
          <div
            className="h-full rounded-full transition-all bg-forest-950"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <div>
        {steps.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              'flex items-center gap-3 px-5 py-3',
              i < steps.length - 1 && 'border-b border-b-border-subtle',
              s.done ? 'bg-surface-sunken' : 'bg-surface-card'
            )}
          >
            {/* Tick */}
            <div className={cn('w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0', s.done ? 'bg-forest-950' : 'bg-surface-sunken')}>
              {s.done
                ? <Check weight="regular" className="w-3 h-3 text-white" />
                : <span className="w-2 h-2 rounded-full block bg-border-default" />
              }
            </div>

            {/* Text */}
            <div className="flex-1">
              <p className={cn('text-sm font-medium', s.done ? 'text-text-muted line-through' : 'text-text-primary')}>
                {s.label}
              </p>
              {!s.done && <p className="text-caption mt-px text-text-secondary">{s.desc}</p>}
            </div>

            {/* CTA */}
            {!s.done && (
              <Link
                href={s.href}
                className="flex items-center gap-[3px] text-caption font-semibold rounded-md px-[10px] py-[5px] no-underline whitespace-nowrap text-text-primary bg-surface-sunken"
              >
                {s.cta} <CaretRight weight="regular" className="w-[11px] h-[11px]" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
