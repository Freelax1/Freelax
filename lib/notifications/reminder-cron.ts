import { createServiceClient } from '@/lib/supabase/server'
import { sendAccountEmail } from '@/lib/email/send-account-email'
import { getVatThresholdWarning, formatCurrency, getCurrentTaxYear } from '@/lib/tax-calculations'
import { calcTaxDeadline } from '@/lib/logic/dashboard'

export type ReminderType =
  | 'invoices_overdue'
  | 'vat_threshold'
  | 'sa_deadline'
  | 'tax_year_end'

const REMINDER_DAYS = [0, 7, 14, 30] as const

type UserRow = {
  id: string
  email: string
  full_name: string | null
  business_name: string | null
  notify_invoices_overdue: boolean
  notify_vat_threshold: boolean
  notify_sa_deadline: boolean
  notify_tax_year_end: boolean
}

type EmailPayload = {
  subject: string
  heading: string
  bodyHtml: string
  cta?: { label: string; href: string }
}

export type ReminderCronResult = {
  processed: number
  sent: number
  skipped: number
  errors: number
  noResend: boolean
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function daysUntil(target: Date, from = new Date()): number {
  return Math.round((startOfDay(target).getTime() - startOfDay(from).getTime()) / 86400000)
}

function nextCalendarDate(month: number, day: number, from = new Date()): Date {
  let year = from.getFullYear()
  const candidate = new Date(year, month, day)
  if (startOfDay(candidate) < startOfDay(from)) year += 1
  return new Date(year, month, day)
}

function shouldSendOnCountdown(target: Date, from = new Date()): boolean {
  return (REMINDER_DAYS as readonly number[]).includes(daysUntil(target, from))
}

function appUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://app.freelax.co.uk').replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

function displayName(user: UserRow): string {
  return user.business_name || user.full_name || 'there'
}

async function alreadySentToday(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  type: ReminderType,
  today: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('notification_reminder_log')
    .select('id')
    .eq('user_id', userId)
    .eq('reminder_type', type)
    .eq('sent_on', today)
    .maybeSingle()
  return !!data
}

async function logSent(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  type: ReminderType,
  today: string,
): Promise<void> {
  await supabase.from('notification_reminder_log').insert({
    user_id: userId,
    reminder_type: type,
    sent_on: today,
  })
}

async function rollingIncomeExVat(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  since: string,
): Promise<number> {
  const { data: paid } = await supabase
    .from('invoices')
    .select('total, vat_amount')
    .eq('user_id', userId)
    .eq('status', 'paid')
    .gte('paid_date', since)
  return paid?.reduce((s, i) => s + (Number(i.total) - Number(i.vat_amount ?? 0)), 0) ?? 0
}

async function trySend(
  supabase: ReturnType<typeof createServiceClient>,
  user: UserRow,
  type: ReminderType,
  today: string,
  payload: EmailPayload,
  result: ReminderCronResult,
): Promise<void> {
  const { sent, error: sendErr } = await sendAccountEmail({
    to: user.email,
    ...payload,
  })
  if (!sent) {
    console.error('reminder-cron send', type, user.id, sendErr)
    result.errors++
    return
  }
  await logSent(supabase, user.id, type, today)
  result.sent++
}

export async function runNotificationReminderCron(): Promise<ReminderCronResult> {
  const result: ReminderCronResult = {
    processed: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
    noResend: !process.env.RESEND_API_KEY,
  }

  if (result.noResend) return result

  const supabase = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date()

  const { data: users, error } = await supabase
    .from('users')
    .select(
      'id, email, full_name, business_name, notify_invoices_overdue, notify_vat_threshold, notify_sa_deadline, notify_tax_year_end',
    )
    .not('email', 'is', null)

  if (error || !users?.length) return result

  const { end: taxYearEnd } = getCurrentTaxYear()
  const saDeadline = calcTaxDeadline(taxYearEnd)
  const saTarget = nextCalendarDate(0, 31, now)
  const taxYearEndTarget = nextCalendarDate(3, 5, now)

  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
  const rollingSince = twelveMonthsAgo.toISOString().slice(0, 10)

  const overdueBefore = new Date()
  overdueBefore.setDate(overdueBefore.getDate() - 7)
  const overdueBeforeStr = overdueBefore.toISOString().slice(0, 10)

  for (const user of users as UserRow[]) {
    result.processed++
    const name = displayName(user)
    if (!user.email) {
      result.skipped++
      continue
    }

    if (user.notify_invoices_overdue) {
      const type: ReminderType = 'invoices_overdue'
      if (!(await alreadySentToday(supabase, user.id, type, today))) {
        try {
          const { count } = await supabase
            .from('invoices')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .in('status', ['sent', 'overdue'])
            .lt('due_date', overdueBeforeStr)
          if ((count ?? 0) > 0) {
            await trySend(supabase, user, type, today, {
              subject: 'Freelax — overdue invoices need attention',
              heading: 'Invoices overdue',
              bodyHtml: `<p>Hi ${name},</p><p>You have one or more invoices more than 7 days past due. Chase or mark them paid in Freelax.</p>`,
              cta: { label: 'View invoices', href: appUrl('/invoices') },
            }, result)
          }
        } catch (e) {
          console.error('reminder-cron invoices_overdue', user.id, e)
          result.errors++
        }
      } else {
        result.skipped++
      }
    }

    if (user.notify_vat_threshold) {
      const type: ReminderType = 'vat_threshold'
      if (!(await alreadySentToday(supabase, user.id, type, today))) {
        try {
          const rolling = await rollingIncomeExVat(supabase, user.id, rollingSince)
          const warning = getVatThresholdWarning(rolling)
          if (warning) {
            await trySend(supabase, user, type, today, {
              subject: 'Freelax — VAT threshold approaching',
              heading: 'VAT registration threshold',
              bodyHtml: `<p>Hi ${name},</p><p>${warning}</p><p>Rolling 12-month income (ex-VAT): <strong>${formatCurrency(rolling)}</strong>.</p>`,
              cta: { label: 'Review tax', href: appUrl('/tax') },
            }, result)
          }
        } catch (e) {
          console.error('reminder-cron vat_threshold', user.id, e)
          result.errors++
        }
      } else {
        result.skipped++
      }
    }

    if (user.notify_sa_deadline && shouldSendOnCountdown(saTarget, now)) {
      const type: ReminderType = 'sa_deadline'
      if (!(await alreadySentToday(supabase, user.id, type, today))) {
        try {
          await trySend(supabase, user, type, today, {
            subject: 'Freelax — Self Assessment deadline reminder',
            heading: 'Self Assessment due soon',
            bodyHtml: `<p>Hi ${name},</p><p>Your Self Assessment deadline is <strong>${saDeadline.label}</strong> (${saDeadline.days} day${saDeadline.days === 1 ? '' : 's'} left).</p>`,
            cta: { label: 'Open tax', href: appUrl('/tax') },
          }, result)
        } catch (e) {
          console.error('reminder-cron sa_deadline', user.id, e)
          result.errors++
        }
      } else {
        result.skipped++
      }
    }

    if (user.notify_tax_year_end && shouldSendOnCountdown(taxYearEndTarget, now)) {
      const type: ReminderType = 'tax_year_end'
      const daysLeft = daysUntil(taxYearEndTarget, now)
      if (!(await alreadySentToday(supabase, user.id, type, today))) {
        try {
          await trySend(supabase, user, type, today, {
            subject: 'Freelax — tax year end reminder',
            heading: 'Tax year ends 5 April',
            bodyHtml: `<p>Hi ${name},</p><p>The UK tax year ends on <strong>5 April</strong> (${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining).</p>`,
            cta: { label: 'Review tax', href: appUrl('/tax') },
          }, result)
        } catch (e) {
          console.error('reminder-cron tax_year_end', user.id, e)
          result.errors++
        }
      } else {
        result.skipped++
      }
    }
  }

  return result
}
