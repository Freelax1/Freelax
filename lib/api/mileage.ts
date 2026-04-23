import { createClient } from '@/lib/supabase/client'

// HMRC approved mileage allowance: 45p/mile first 10,000 miles, 25p thereafter
export const HMRC_RATE_FIRST  = 0.45
export const HMRC_RATE_AFTER  = 0.25
export const HMRC_THRESHOLD   = 10000

export function calcMileageRelief(totalMiles: number): number {
  if (totalMiles <= HMRC_THRESHOLD) return totalMiles * HMRC_RATE_FIRST
  return (HMRC_THRESHOLD * HMRC_RATE_FIRST) + ((totalMiles - HMRC_THRESHOLD) * HMRC_RATE_AFTER)
}

export function calcMileageRate(milesAlreadyDone: number): number {
  return milesAlreadyDone >= HMRC_THRESHOLD ? HMRC_RATE_AFTER : HMRC_RATE_FIRST
}

export async function fetchMileageEntries(userId: string, taxYearStart: number) {
  const supabase = createClient()
  const { data } = await supabase
    .from('mileage_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('tax_year_start', taxYearStart)
    .order('date', { ascending: false })
  return data ?? []
}

export async function addMileageEntry(entry: {
  user_id: string
  date: string
  description: string
  from_location?: string
  to_location?: string
  miles: number
  purpose?: string
  tax_year_start: number
}) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('mileage_entries')
    .insert(entry)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMileageEntry(id: string) {
  const supabase = createClient()
  await supabase.from('mileage_entries').delete().eq('id', id)
}
