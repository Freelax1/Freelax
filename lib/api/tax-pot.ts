import { createClient } from '@/lib/supabase/client'

export async function fetchTaxPotTotal(userId: string, taxYearStart: number): Promise<number> {
  const supabase = createClient()
  const { data } = await supabase
    .from('tax_pot_entries')
    .select('amount')
    .eq('user_id', userId)
    .eq('tax_year_start', taxYearStart)
  return (data ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0)
}

export async function fetchTaxPotEntries(userId: string, taxYearStart: number) {
  const supabase = createClient()
  const { data } = await supabase
    .from('tax_pot_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('tax_year_start', taxYearStart)
    .order('date', { ascending: false })
    .limit(10)
  return data ?? []
}

export async function addTaxPotEntry(entry: {
  user_id: string
  amount: number
  note?: string
  date: string
  tax_year_start: number
}) {
  const supabase = createClient()
  const { data } = await supabase
    .from('tax_pot_entries')
    .insert(entry)
    .select()
    .single()
  return data
}
