'use client'

import Link from 'next/link'
import { Check, ChevronRight } from 'lucide-react'

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
      label: 'Create a project (optional)',
      desc: 'Track contracts and get an IR35 status on each engagement.',
      href: '/projects/new',
      done: hasProjects,
      cta: 'Create project',
    },
  ]

  const completedCount = steps.filter(s => s.done).length
  const allDone = completedCount === steps.length

  if (allDone) return null

  return (
    <div id="getting-started" className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 600, color: '#111' }}>
            Get started with Freedesk
          </h2>
          <p style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
            {completedCount} of {steps.length} complete
          </p>
        </div>
        {/* Progress bar */}
        <div style={{ width: 100, height: 6, background: '#F0F0F0', borderRadius: 99, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              background: '#111',
              borderRadius: 99,
              width: `${(completedCount / steps.length) * 100}%`,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>
      <div>
        {steps.map((s, i) => (
          <div
            key={s.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 20px',
              borderBottom: i < steps.length - 1 ? '1px solid #F7F7F7' : 'none',
              background: s.done ? '#FAFAFA' : '#fff',
            }}
          >
            {/* Tick */}
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: s.done ? '#111' : '#F0F0F0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {s.done
                ? <Check style={{ width: 12, height: 12, color: '#fff' }} />
                : <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#CCC', display: 'block' }} />
              }
            </div>

            {/* Text */}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: s.done ? '#AAA' : '#111', textDecoration: s.done ? 'line-through' : 'none' }}>
                {s.label}
              </p>
              {!s.done && <p style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{s.desc}</p>}
            </div>

            {/* CTA */}
            {!s.done && (
              <Link
                href={s.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  fontSize: 11, fontWeight: 600, color: '#111',
                  background: '#F3F3F3', borderRadius: 6,
                  padding: '5px 10px', textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.cta} <ChevronRight style={{ width: 11, height: 11 }} />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
