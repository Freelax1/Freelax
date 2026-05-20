export interface Notification {
  id:       string
  type:     'overdue' | 'due_soon' | 'quote_expiring' | 'ir35_risk'
  title:    string
  sub:      string
  href:     string
  priority: 'red' | 'amber'
}

type ClientJoin = { name: string } | { name: string }[] | null

function clientName(c: ClientJoin): string | undefined {
  if (!c) return undefined
  return Array.isArray(c) ? c[0]?.name : c.name
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)
}

export function buildNotifications(
  invoices: { id: string; invoice_number: string; status: string; total: number; due_date: string; clients: ClientJoin }[],
  quotes:   { id: string; quote_number: string; status: string; total: number; expiry_date: string | null; clients: ClientJoin }[],
  projects: { id: string; title: string; ir35_status: string; status: string; clients: ClientJoin }[],
): Notification[] {
  const today    = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const out: Notification[] = []

  invoices.filter(i => i.status === 'overdue').forEach(i => {
    const days = Math.floor((today.getTime() - new Date(i.due_date).getTime()) / 86400000)
    out.push({
      id: `invoice-overdue-${i.id}`, type: 'overdue', priority: 'red',
      title: `${i.invoice_number} is overdue`,
      sub: `${clientName(i.clients) ?? 'Unknown'} · ${days}d late`,
      href: `/invoices/${i.id}`,
    })
  })

  invoices.filter(i => ['sent', 'draft'].includes(i.status)).forEach(i => {
    const days = Math.floor((new Date(i.due_date).getTime() - today.getTime()) / 86400000)
    if (days >= 0 && days <= 3) {
      out.push({
        id: `invoice-due-soon-${i.id}-${todayStr}`, type: 'due_soon', priority: 'amber',
        title: `${i.invoice_number} due ${days === 0 ? 'today' : `in ${days}d`}`,
        sub: `${clientName(i.clients) ?? 'Unknown'} · ${fmt(i.total)}`,
        href: `/invoices/${i.id}`,
      })
    }
  })

  quotes.filter(q => q.status === 'sent').forEach(q => {
    if (!q.expiry_date) return
    const days = Math.floor((new Date(q.expiry_date).getTime() - today.getTime()) / 86400000)
    if (days >= 0 && days <= 3) {
      out.push({
        id: `quote-expiring-${q.id}-${todayStr}`, type: 'quote_expiring', priority: 'amber',
        title: `${q.quote_number} expires ${days === 0 ? 'today' : `in ${days}d`}`,
        sub: clientName(q.clients) ?? 'Unknown',
        href: `/quotes/${q.id}`,
      })
    }
  })

  projects.filter(p => p.status === 'active' && ['inside_ir35', 'needs_review'].includes(p.ir35_status)).forEach(p => {
    out.push({
      id: `ir35-risk-${p.id}`, type: 'ir35_risk',
      priority: p.ir35_status === 'inside_ir35' ? 'red' : 'amber',
      title: `${p.title} needs IR35 review`,
      sub: clientName(p.clients) ?? 'Unknown',
      href: `/projects/${p.id}`,
    })
  })

  return out
}

export const DISMISSED_KEY  = 'fd_dismissed_notifications'
export const SUPPRESSED_KEY = 'fd_suppressed_notifications'
export const READ_KEY        = 'fd_read_notifications'

export const TYPE_LABEL: Record<Notification['type'], string> = {
  overdue:        'Overdue invoice',
  due_soon:       'Due soon',
  quote_expiring: 'Quote expiring',
  ir35_risk:      'IR35 risk',
}
