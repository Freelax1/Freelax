'use client'

import { Check } from '@phosphor-icons/react'
import { ButtonLink } from '@/components/ui/button'
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
      href: '/expenses/new',
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
            className="h-full rounded-full transition-all bg-brand-primary"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <div>
        {steps.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              'px-5 py-3',
              i < steps.length - 1 && 'border-b border-border-subtle',
              s.done ? 'bg-surface-sunken' : 'bg-surface-card',
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div
                  className={cn(
                    'w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 mt-0.5',
                    s.done ? 'bg-brand-primary' : 'bg-surface-sunken',
                  )}
                >
                  {s.done ? (
                    <Check weight="regular" className="w-3 h-3 text-white" />
                  ) : (
                    <span className="w-2 h-2 rounded-full block bg-border-default" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      s.done ? 'text-text-muted line-through' : 'text-text-primary',
                    )}
                  >
                    {s.label}
                  </p>
                  {!s.done && (
                    <p className="text-caption mt-0.5 text-text-secondary leading-relaxed">{s.desc}</p>
                  )}
                </div>
              </div>

              {!s.done && (
                <ButtonLink
                  href={s.href}
                  intent="secondary"
                  size="xs"
                  className="w-full sm:w-auto shrink-0 justify-center"
                >
                  {s.cta} →
                </ButtonLink>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
