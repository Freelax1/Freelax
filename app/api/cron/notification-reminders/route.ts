// Daily cron — email reminders based on Settings → Notifications prefs.
// Configure RESEND_API_KEY, CRON_SECRET, and vercel.json schedule.

import { NextResponse } from 'next/server'
import { runNotificationReminderCron } from '@/lib/notifications/reminder-cron'

export const maxDuration = 60

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runNotificationReminderCron()
  return NextResponse.json(result)
}
