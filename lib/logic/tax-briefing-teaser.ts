import { formatCurrency } from '@/lib/tax-calculations'

export type TaxBriefingTeaserInput = {
  hasData: boolean
  incomeExVat: number
  totalExpenses: number
  expenseCount: number
  taxOwed: number
  taxPotGap: number
  hasTaxProfile: boolean
  higherRateAlert?: boolean
  paAlert?: boolean
}

const COPILOT_TAIL = 'your copilot may have a few things worth checking.'

/** Plain-language hook shown before the user opens the full briefing */
export function buildTaxBriefingTeaser(input: TaxBriefingTeaserInput): string {
  if (!input.hasData) {
    return `Log invoices and expenses for this tax year, and ${COPILOT_TAIL}`
  }

  const expenseRatio =
    input.incomeExVat > 0 ? input.totalExpenses / input.incomeExVat : 0

  if (input.incomeExVat > 0 && input.expenseCount === 0) {
    return `Are you claiming everything you're entitled to? You have income logged but no expenses yet — ${COPILOT_TAIL}`
  }

  if (input.incomeExVat > 0 && expenseRatio < 0.12) {
    return `Are you claiming everything you're entitled to? Your expenses look lower than usual — ${COPILOT_TAIL}`
  }

  if (input.taxPotGap > 0 && input.taxOwed > 0) {
    return `Are you setting aside enough for tax? You still have ${formatCurrency(input.taxPotGap)} to save — ${COPILOT_TAIL}`
  }

  if (input.paAlert) {
    return `Are you making the most of your tax position? Your income is in the Personal Allowance taper zone — ${COPILOT_TAIL}`
  }

  if (input.higherRateAlert) {
    return `Are you claiming everything you're entitled to? Some of your income is taxed at 40% — ${COPILOT_TAIL}`
  }

  if (!input.hasTaxProfile) {
    return `Are your tax figures as accurate as they could be? Add your tax profile for a sharper estimate — ${COPILOT_TAIL}`
  }

  return `Are you claiming everything you're entitled to? — ${COPILOT_TAIL}`
}
