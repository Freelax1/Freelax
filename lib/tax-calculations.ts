// ─────────────────────────────────────────────────────────────────────────────
// Freedesk — Tax Calculations Engine v1.3
// Built for UK freelancers and contractors: sole traders, Ltd company PSCs,
// and partnerships. Current tax year: 2026/27 (from 6 April 2026).
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ─────────────────────────────────────────────────────────────────────

export type StudentLoanPlan = 'none' | 'plan1' | 'plan2' | 'plan4' | 'plan5' | 'postgrad'

export interface TaxInputs {
  // Core
  grossIncome: number          // total invoiced income ex-VAT
  totalExpenses: number        // allowable business expenses
  businessType: 'sole_trader' | 'limited_company' | 'partnership'

  // Optional modifiers — affect take-home
  pensionContributions?: number  // annual SIPP / personal pension contributions
  studentLoanPlan?: StudentLoanPlan

  // Ltd company only
  salaryDrawn?: number           // director salary (usually ~£12,570)
  dividendsDrawn?: number        // dividends taken from company profits
}

export interface SoleTraderTax {
  kind: 'sole_trader'
  grossIncome: number
  totalExpenses: number
  netProfit: number

  // Income tax
  personalAllowance: number      // may be reduced above £100k
  taxableIncome: number
  basicRateTax: number           // 20%
  higherRateTax: number          // 40%
  additionalRateTax: number      // 45%
  incomeTax: number

  // NI
  classFourNI: number            // 6% / 2%

  // Student loan
  studentLoanRepayment: number

  // Pension
  pensionContributions: number
  pensionTaxRelief: number       // basic rate relief added to pension pot at source (20%)
  higherRatePensionRelief:     number // additional relief claimable via SA for 40% taxpayers
  additionalRatePensionRelief: number // additional relief claimable via SA for 45% taxpayers
  totalExtraReliefViaSA:       number // total extra relief to claim via SA (higher + additional)

  // Payments on account
  paymentsOnAccount: number      // 50% of bill, due Jan + Jul
  totalJanuaryPayment: number    // balancing payment + 1st POA
  julyPayment: number            // 2nd POA

  // Summary
  totalTax: number               // income tax + NI + student loan
  totalDeductions: number        // totalTax + pension contributions
  takeHome: number               // net profit - totalTax - pension contributions
  effectiveTaxRate: number       // totalTax / grossIncome (%)

  // Alerts
  paAlert: boolean               // PA taper active (income > £100k)
  higherRateAlert: boolean       // in higher rate band
}

export interface LtdCompanyTax {
  kind: 'limited_company'
  grossIncome: number
  totalExpenses: number
  companyProfit: number          // gross income - expenses - salary

  // Corporation tax
  corporationTax: number         // 19% / marginal / 25%
  corporationTaxRate: number     // effective rate shown as %
  profitAfterCorpTax: number

  // Director salary
  salaryDrawn: number
  salaryIncomeTax: number        // usually £0 if at PA
  employeeNI: number             // 8% between £12,570-£50,270, 2% above
  employerNI: number             // 15% on salary above £5,000 (rate & threshold per Autumn Budget 2024)

  // Dividends
  dividendsDrawn: number
  dividendAllowance: number      // £500 — unchanged for 2026/27
  taxableDividends: number
  dividendTax: number            // 10.75% / 35.75% / 39.35% (2026/27 rates)

  // Student loan (on salary + dividends combined)
  studentLoanRepayment: number

  // Pension
  pensionContributions: number

  // Payments on account (personal SA bill)
  paymentsOnAccount: number
  totalJanuaryPayment: number
  julyPayment: number

  // Summary
  totalPersonalTax: number       // income tax on salary + dividend tax + NI + student loan
  totalCompanyTax: number        // corporation tax + employer NI
  takeHome: number               // salary + dividends - personal tax - pension
  effectiveTaxRate: number       // total tax burden / gross income (%)

  // Retained profit
  retainedProfit: number         // profit after corp tax - dividends drawn
}

export type TaxCalculation = SoleTraderTax | LtdCompanyTax

// Legacy interface for backward compatibility with existing dashboard/components
export interface SimpleTaxCalculation {
  incomeTax: number
  classFourNI: number
  total: number
}

// ── Constants — 2026/27 (6 April 2026 – 5 April 2027) ──────────────────────────

const PA_STANDARD         = 12_570   // Personal Allowance
const PA_TAPER_START      = 100_000  // PA starts reducing above this
const PA_TAPER_END        = 125_140  // PA = £0 above this
const BASIC_RATE_LIMIT    = 50_270   // Basic rate top
const HIGHER_RATE_LIMIT   = 125_140  // Higher rate top / additional rate starts

const INCOME_TAX_BASIC    = 0.20
const INCOME_TAX_HIGHER   = 0.40
const INCOME_TAX_ADDL     = 0.45

// Class 4 NI (self-employed)
const C4_LOWER_LIMIT      = 12_570
const C4_UPPER_LIMIT      = 50_270
const C4_MAIN_RATE        = 0.06     // 6% — in effect from April 2024, unchanged 2026/27
const C4_UPPER_RATE       = 0.02

// Corporation tax (2023/24 onwards)
const CORP_TAX_SMALL      = 0.19     // profits ≤ £50,000
const CORP_TAX_MAIN       = 0.25     // profits ≥ £250,000
const CORP_TAX_SMALL_LIMIT = 50_000
const CORP_TAX_MAIN_LIMIT  = 250_000

// Dividends
const DIVIDEND_ALLOWANCE  = 500      // £500 — unchanged for 2026/27
// Dividend rates — 2026/27 (increased by 2pp from 6 April 2026)
const DIV_BASIC_RATE      = 0.1075   // was 0.0875 in 2025/26
const DIV_HIGHER_RATE     = 0.3575   // was 0.3375 in 2025/26
const DIV_ADDL_RATE       = 0.3935   // unchanged

// Employee NI (directors / employees)
const EMP_NI_LOWER        = 12_570
const EMP_NI_UPPER        = 50_270
const EMP_NI_MAIN         = 0.08     // 8% — in effect from April 2024, unchanged 2026/27
const EMP_NI_UPPER_RATE   = 0.02

// Employer NI
// Secondary Threshold reduced from £9,100 to £5,000 from 6 April 2025 (Autumn Budget 2024).
// Confirmed unchanged at £5,000 for 2026/27.
const ER_NI_THRESHOLD     = 5_000
const ER_NI_RATE          = 0.15     // 15% — raised from 13.8% in Autumn Budget 2024 (effective 6 Apr 2025)

// Student loan repayment thresholds — 2026/27 (from 6 April 2026)
// Source: HMRC Employer Bulletin December 2025 + ATT confirmation
// Plans 1, 2, 4 increased by 3.2% (RPI). Plan 5 and Postgrad unchanged.
const STUDENT_LOAN = {
  plan1:    { threshold: 26_900, rate: 0.09 },  // up from £26,065 in 2025/26
  plan2:    { threshold: 29_385, rate: 0.09 },  // up from £28,470 in 2025/26; frozen until Apr 2030
  plan4:    { threshold: 33_795, rate: 0.09 },  // up from £32,745 in 2025/26 (Scotland)
  plan5:    { threshold: 25_000, rate: 0.09 },  // unchanged; increases with RPI from Apr 2027
  postgrad: { threshold: 21_000, rate: 0.06 },  // unchanged since introduction
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Personal Allowance after £100k taper */
function effectivePA(adjustedNetIncome: number): number {
  if (adjustedNetIncome <= PA_TAPER_START) return PA_STANDARD
  if (adjustedNetIncome >= PA_TAPER_END)   return 0
  // Reduce by £1 for every £2 above £100k
  const reduction = Math.floor((adjustedNetIncome - PA_TAPER_START) / 2)
  return Math.max(0, PA_STANDARD - reduction)
}

/** Pension contributions extend the basic rate band by the gross contribution */
function extendedBasicRateLimit(pensionContribs: number): number {
  return BASIC_RATE_LIMIT + pensionContribs
}

/** Income tax on earned income (sole trader profit or salary).
 *  effectivePA must be passed so band boundaries adjust correctly
 *  when the Personal Allowance is tapered above £100k.
 *  taxableIncome is gross income MINUS effectivePA (already net of PA).
 */
function calcIncomeTax(
  taxableIncome: number,
  effectivePA: number = PA_STANDARD,
  pensionContribs: number = 0,
): number {
  if (taxableIncome <= 0) return 0

  // Band boundaries in taxable-income terms (i.e. above PA):
  //   basic band top  = BRL - effectivePA + pension
  //   higher band top = HRL - effectivePA + pension
  // When PA is full (£12,570): basicBand = £37,700 (standard)
  // When PA = 0 (tapered away): basicBand = £50,270 (full BRL)
  const basicBand    = (BASIC_RATE_LIMIT   - effectivePA) + pensionContribs
  const higherBandTop = (HIGHER_RATE_LIMIT - effectivePA) + pensionContribs

  let tax = 0
  const basic = Math.min(taxableIncome, basicBand)
  tax += basic * INCOME_TAX_BASIC

  if (taxableIncome > basicBand) {
    const higher = Math.min(taxableIncome - basicBand, higherBandTop - basicBand)
    tax += higher * INCOME_TAX_HIGHER
  }
  if (taxableIncome > higherBandTop) {
    tax += (taxableIncome - higherBandTop) * INCOME_TAX_ADDL
  }

  return Math.max(0, tax)
}

/** Dividend tax — sits on top of other income.
 *  effectivePA adjusts band boundaries when PA is tapered.
 */
function calcDividendTax(
  dividends: number,
  otherTaxableIncome: number,
  effectivePA: number = PA_STANDARD,
  pensionContribs: number = 0,
): number {
  if (dividends <= 0) return 0

  const taxableDivs = Math.max(0, dividends - DIVIDEND_ALLOWANCE)
  if (taxableDivs <= 0) return 0

  const basicBand     = (BASIC_RATE_LIMIT   - effectivePA) + pensionContribs
  const higherBandTop = (HIGHER_RATE_LIMIT  - effectivePA) + pensionContribs

  const remainingBasic  = Math.max(0, basicBand     - otherTaxableIncome)
  const remainingHigher = Math.max(0, higherBandTop - Math.max(otherTaxableIncome, basicBand))

  let tax = 0
  let remaining = taxableDivs

  const basicPortion = Math.min(remaining, remainingBasic)
  tax += basicPortion * DIV_BASIC_RATE
  remaining -= basicPortion

  if (remaining > 0) {
    const higherPortion = Math.min(remaining, remainingHigher)
    tax += higherPortion * DIV_HIGHER_RATE
    remaining -= higherPortion
  }

  if (remaining > 0) {
    tax += remaining * DIV_ADDL_RATE
  }

  return tax
}

/** Class 4 NI for self-employed */
function calcClassFourNI(profit: number): number {
  if (profit <= C4_LOWER_LIMIT) return 0
  let ni = 0
  const main = Math.min(profit - C4_LOWER_LIMIT, C4_UPPER_LIMIT - C4_LOWER_LIMIT)
  ni += main * C4_MAIN_RATE
  if (profit > C4_UPPER_LIMIT) {
    ni += (profit - C4_UPPER_LIMIT) * C4_UPPER_RATE
  }
  return ni
}

/** Employee NI (director or PAYE employee) */
function calcEmployeeNI(salary: number): number {
  if (salary <= EMP_NI_LOWER) return 0
  let ni = 0
  const main = Math.min(salary - EMP_NI_LOWER, EMP_NI_UPPER - EMP_NI_LOWER)
  ni += main * EMP_NI_MAIN
  if (salary > EMP_NI_UPPER) {
    ni += (salary - EMP_NI_UPPER) * EMP_NI_UPPER_RATE
  }
  return ni
}

/** Employer NI */
function calcEmployerNI(salary: number): number {
  if (salary <= ER_NI_THRESHOLD) return 0
  return (salary - ER_NI_THRESHOLD) * ER_NI_RATE
}

/** Corporation tax with marginal relief (HMRC formula).
 *  Relief = F × (U − A) × N÷A
 *  For simple case (no associated companies, N=A=profits):
 *  Relief = (3/200) × (250,000 − profits)
 *  CT = profits × 25% − (3/200) × (250,000 − profits)
 */
function calcCorpTax(profit: number): number {
  if (profit <= 0) return 0
  if (profit <= CORP_TAX_SMALL_LIMIT) return profit * CORP_TAX_SMALL
  if (profit >= CORP_TAX_MAIN_LIMIT)  return profit * CORP_TAX_MAIN

  // HMRC marginal relief formula: F × (U − profits), where F = 3/200
  const marginalRelief = (3 / 200) * (CORP_TAX_MAIN_LIMIT - profit)
  return profit * CORP_TAX_MAIN - marginalRelief
}

/** Student loan repayment on given income */
function calcStudentLoan(income: number, plan: StudentLoanPlan): number {
  if (plan === 'none' || !plan) return 0
  const config = STUDENT_LOAN[plan]
  if (!config || income <= config.threshold) return 0
  return (income - config.threshold) * config.rate
}

/** Payments on account — only if SA bill > £1,000
 *  januaryTotal = current year bill + 1st POA (worst case / first SA year)
 *  In subsequent years the January figure = balancing payment + 1st POA,
 *  which requires last year's bill — we surface both components so the UI
 *  can show them clearly.
 */
function calcPOA(saBill: number): { poa: number; januaryTotal: number; julyPayment: number } {
  if (saBill < 1_000) {
    return { poa: 0, januaryTotal: saBill, julyPayment: 0 }
  }
  const poa = Math.round(saBill / 2)
  return {
    poa,
    januaryTotal: saBill + poa,  // full current bill + 1st POA (first SA year)
    julyPayment:  poa,           // 2nd POA due July
  }
}

// ── Main export: calculateTax ─────────────────────────────────────────────────

export function calculateTax(inputs: TaxInputs): TaxCalculation
export function calculateTax(netProfit: number): SimpleTaxCalculation
export function calculateTax(inputsOrProfit: TaxInputs | number): TaxCalculation | SimpleTaxCalculation {

  // ── Backward-compatible simple call (number only) ──
  if (typeof inputsOrProfit === 'number') {
    const netProfit = inputsOrProfit
    const pa = effectivePA(netProfit)
    const taxableIncome = Math.max(0, netProfit - pa)
    // Pass effectivePA so band boundaries are correct when PA is tapered above £100k
    const incomeTax = calcIncomeTax(taxableIncome, pa)
    const classFourNI = calcClassFourNI(netProfit)
    return {
      incomeTax: Math.round(incomeTax),
      classFourNI: Math.round(classFourNI),
      total: Math.round(incomeTax + classFourNI),
    }
  }

  const {
    grossIncome,
    totalExpenses,
    businessType,
    pensionContributions = 0,
    studentLoanPlan = 'none',
    salaryDrawn,
    dividendsDrawn,
  } = inputsOrProfit

  // ── SOLE TRADER ────────────────────────────────────────────────────────────
  if (businessType === 'sole_trader' || businessType === 'partnership') {
    const netProfit = Math.max(0, grossIncome - totalExpenses)

    // Adjusted net income for PA taper = profit minus pension (HMRC rules)
    // For relief-at-source pensions (SIPP — standard for freelancers):
    //   - pension contributions reduce adjusted net income (affects PA taper)
    //   - pension contributions extend the basic rate band
    //   - pension contributions do NOT reduce taxable income (no double relief)
    const adjustedNetIncome = netProfit - pensionContributions
    const pa = effectivePA(adjustedNetIncome)
    const paAlert = adjustedNetIncome > PA_TAPER_START

    // taxableIncome = profit minus PA only (pension handled via band extension)
    const taxableIncome = Math.max(0, netProfit - pa)
    const incomeTax = calcIncomeTax(taxableIncome, pa, pensionContributions)
    const classFourNI = calcClassFourNI(netProfit)
    const studentLoan = calcStudentLoan(netProfit, studentLoanPlan)

    // Pension tax relief:
    //   Basic rate (20%) is added to the pension pot automatically by the provider (relief at source).
    //   Higher/additional-rate taxpayers claim the EXTRA relief via Self Assessment,
    //   but ONLY on the portion of pension that would have been taxed at those higher rates.
    const pensionTaxRelief = Math.min(pensionContributions, netProfit) * INCOME_TAX_BASIC

    // Band boundaries in post-PA terms
    const higherRateStart     = BASIC_RATE_LIMIT - pa
    const additionalRateStart = HIGHER_RATE_LIMIT - pa

    // Taxable income before pension band extension is applied
    const taxableIncomePreRelief = taxableIncome + pensionContributions

    // How much income sits in each upper band (before pension relief)
    const amountInHigher = Math.max(0,
      Math.min(taxableIncomePreRelief, additionalRateStart) - higherRateStart
    )
    const amountInAdditional = Math.max(0, taxableIncomePreRelief - additionalRateStart)

    // Pension contribution drains upper bands top-down; only overlapping portion gets extra relief
    const additionalAbsorbed = Math.min(pensionContributions, amountInAdditional)
    const higherAbsorbed     = Math.min(pensionContributions - additionalAbsorbed, amountInHigher)

    const higherRatePensionRelief     = higherAbsorbed * (INCOME_TAX_HIGHER - INCOME_TAX_BASIC)
    const additionalRatePensionRelief = additionalAbsorbed * (INCOME_TAX_ADDL - INCOME_TAX_HIGHER)
    const totalExtraReliefViaSA       = higherRatePensionRelief + additionalRatePensionRelief

    const totalTax = incomeTax + classFourNI + studentLoan
    const totalDeductions = totalTax + pensionContributions
    const takeHome = netProfit - totalTax - pensionContributions
    const effectiveTaxRate = grossIncome > 0
      ? Math.round((totalTax / grossIncome) * 1000) / 10
      : 0

    // HMRC: POA is based on IT + Class 4 NI only — student loan excluded
    const { poa, januaryTotal, julyPayment } = calcPOA(Math.round(incomeTax + classFourNI))

    return {
      kind: 'sole_trader',
      grossIncome: Math.round(grossIncome),
      totalExpenses: Math.round(totalExpenses),
      netProfit: Math.round(netProfit),
      personalAllowance: Math.round(pa),
      taxableIncome: Math.round(taxableIncome),
      // Band breakdown — derived using the same boundaries as calcIncomeTax so the
      // three rows always sum exactly to incomeTax regardless of pension or PA taper.
      basicRateTax: Math.round(Math.min(taxableIncome, (BASIC_RATE_LIMIT - pa) + pensionContributions) * INCOME_TAX_BASIC),
      higherRateTax: Math.round(Math.max(0, Math.min(taxableIncome - ((BASIC_RATE_LIMIT - pa) + pensionContributions), (HIGHER_RATE_LIMIT - BASIC_RATE_LIMIT))) * INCOME_TAX_HIGHER),
      additionalRateTax: Math.round(Math.max(0, taxableIncome - ((HIGHER_RATE_LIMIT - pa) + pensionContributions)) * INCOME_TAX_ADDL),
      incomeTax: Math.round(incomeTax),
      classFourNI: Math.round(classFourNI),
      studentLoanRepayment: Math.round(studentLoan),
      pensionContributions: Math.round(pensionContributions),
      pensionTaxRelief: Math.round(pensionTaxRelief),
      higherRatePensionRelief:       Math.round(higherRatePensionRelief),
      additionalRatePensionRelief:   Math.round(additionalRatePensionRelief),
      totalExtraReliefViaSA:         Math.round(totalExtraReliefViaSA),
      paymentsOnAccount: Math.round(poa),
      totalJanuaryPayment: Math.round(januaryTotal),
      julyPayment: Math.round(julyPayment),
      totalTax: Math.round(totalTax),
      totalDeductions: Math.round(totalDeductions),
      takeHome: Math.round(takeHome),
      effectiveTaxRate,
      paAlert,
      // higherRateAlert: taxableIncome is post-PA, so compare against post-PA basic band boundary
      higherRateAlert: taxableIncome > (BASIC_RATE_LIMIT - pa) + pensionContributions,
    } satisfies SoleTraderTax
  }

  // ── LIMITED COMPANY (PSC) ──────────────────────────────────────────────────
  if (businessType === 'limited_company') {
    const salary  = salaryDrawn  ?? PA_STANDARD     // default: salary at PA (most tax-efficient)

    // Company-level
    // Employer NI is a deductible company expense — must reduce profit before CT
    const empNI    = calcEmployeeNI(salary)
    const erNI     = calcEmployerNI(salary)
    const companyProfit = Math.max(0, grossIncome - totalExpenses - salary - erNI)
    const corpTax  = calcCorpTax(companyProfit)
    const profitAfterCorpTax = companyProfit - corpTax

    // Cap dividends to post-tax profit — cannot legally distribute more than available
    const divs = Math.min(dividendsDrawn ?? 0, Math.max(0, profitAfterCorpTax))
    const corpTaxRate = companyProfit > 0
      ? Math.round((corpTax / companyProfit) * 1000) / 10
      : 0

    // Personal — director's SA
    const pa = effectivePA(salary + divs - pensionContributions)
    const taxableEarned = Math.max(0, salary - pa)
    const salaryIT = calcIncomeTax(taxableEarned, pa, pensionContributions)
    const divTax   = calcDividendTax(divs, Math.max(0, salary - pa), pa, pensionContributions)
    const studentLoan = calcStudentLoan(salary + divs, studentLoanPlan)

    const totalPersonalTax = salaryIT + empNI + divTax + studentLoan
    const totalCompanyTax  = corpTax + erNI

    const takeHome = salary + divs - totalPersonalTax - pensionContributions
    const effectiveTaxRate = grossIncome > 0
      ? Math.round(((totalPersonalTax + totalCompanyTax) / grossIncome) * 1000) / 10
      : 0

    // HMRC: POA excludes student loan repayments — based on IT + dividend tax only
    const { poa, januaryTotal, julyPayment } = calcPOA(Math.round(salaryIT + divTax))

    const retainedProfit = profitAfterCorpTax - divs

    return {
      kind: 'limited_company',
      grossIncome: Math.round(grossIncome),
      totalExpenses: Math.round(totalExpenses),
      companyProfit: Math.round(companyProfit),
      corporationTax: Math.round(corpTax),
      corporationTaxRate: corpTaxRate,
      profitAfterCorpTax: Math.round(profitAfterCorpTax),
      salaryDrawn: Math.round(salary),
      salaryIncomeTax: Math.round(salaryIT),
      employeeNI: Math.round(empNI),
      employerNI: Math.round(erNI),
      dividendsDrawn: Math.round(divs),
      dividendAllowance: DIVIDEND_ALLOWANCE,
      taxableDividends: Math.round(Math.max(0, divs - DIVIDEND_ALLOWANCE)),
      dividendTax: Math.round(divTax),
      studentLoanRepayment: Math.round(studentLoan),
      pensionContributions: Math.round(pensionContributions),
      paymentsOnAccount: Math.round(poa),
      totalJanuaryPayment: Math.round(januaryTotal),
      julyPayment: Math.round(julyPayment),
      totalPersonalTax: Math.round(totalPersonalTax),
      totalCompanyTax: Math.round(totalCompanyTax),
      takeHome: Math.round(takeHome),
      effectiveTaxRate,
      retainedProfit: Math.round(retainedProfit),
    } satisfies LtdCompanyTax
  }

  // Fallback (shouldn't reach)
  throw new Error(`Unknown business type: ${businessType}`)
}

// ── Utility exports ───────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCurrencyExact(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount)
}

export function getCurrentTaxYear(): { start: Date; end: Date; label: string } {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1
  const day   = now.getDate()

  const isAfterApril6 = month > 4 || (month === 4 && day >= 6)
  const startYear = isAfterApril6 ? year : year - 1
  const endYear   = startYear + 1

  return {
    start: new Date(`${startYear}-04-06`),
    end:   new Date(`${endYear}-04-05`),
    label: `${startYear}/${String(endYear).slice(2)}`,
  }
}

// VAT — 2026/27
const VAT_REGISTRATION_THRESHOLD   = 90_000
const VAT_DEREGISTRATION_THRESHOLD = 88_000

export function getVatThresholdWarning(rollingIncome: number): string | null {
  const threshold = 90_000
  if (rollingIncome >= threshold) {
    return 'You have exceeded the VAT registration threshold of £90,000. You must notify HMRC within 30 days — registration takes effect from the end of the following month after you exceeded the threshold.'
  }
  if (rollingIncome >= threshold * 0.9) {
    return `Your rolling 12-month income is ${formatCurrency(rollingIncome)}. You must register for VAT before reaching £90,000.`
  }
  if (rollingIncome >= threshold * 0.75) {
    return `Your rolling income is approaching the £90,000 VAT threshold (currently ${formatCurrency(rollingIncome)}).`
  }
  return null
}

/**
 * Estimate daily rate needed to hit a desired net take-home.
 * Accounts for tax, NI, holidays, and sick days.
 */
export function calcRequiredDayRate(params: {
  desiredTakeHome: number
  workingDaysPerYear?: number    // default 228 (260 days minus 20 holiday + 12 bank hols)
  businessType?: 'sole_trader' | 'limited_company'
  pensionContributions?: number
  studentLoanPlan?: StudentLoanPlan
}): {
  dayRate: number
  annualGross: number
  effectiveTaxRate: number
} {
  const {
    desiredTakeHome,
    workingDaysPerYear = 228,
    businessType = 'sole_trader',
    pensionContributions = 0,
    studentLoanPlan = 'none',
  } = params

  // Binary search for the gross income that yields the desired take-home
  let low = desiredTakeHome
  let high = desiredTakeHome * 3
  let annualGross = high

  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2
    const result = calculateTax({
      grossIncome: mid,
      totalExpenses: 0,
      businessType,
      pensionContributions,
      studentLoanPlan,
    })

    const th = 'takeHome' in result ? result.takeHome : mid
    if (Math.abs(th - desiredTakeHome) < 1) {
      annualGross = mid
      break
    }
    if (th < desiredTakeHome) low = mid
    else high = mid
    annualGross = mid
  }

  const fullResult = calculateTax({
    grossIncome: annualGross,
    totalExpenses: 0,
    businessType,
    pensionContributions,
    studentLoanPlan,
  })

  return {
    dayRate: Math.ceil(annualGross / workingDaysPerYear),
    annualGross: Math.round(annualGross),
    effectiveTaxRate: 'effectiveTaxRate' in fullResult ? fullResult.effectiveTaxRate : 0,
  }
}

/**
 * Allowable expense categories and their HMRC deductibility rules.
 * Used to flag partial or non-allowable expenses at the point of entry.
 */
export const EXPENSE_ALLOWABILITY: Record<string, {
  allowable: 'full' | 'partial' | 'none'
  note: string
  partialRate?: number
}> = {
  office_supplies:    { allowable: 'full',    note: 'Fully allowable for sole traders and Ltd companies.' },
  travel:             { allowable: 'full',    note: 'Business travel is fully allowable. Commuting to a regular place of work is not.' },
  software:           { allowable: 'full',    note: 'Software used wholly for business is fully allowable.' },
  phone_internet:     { allowable: 'partial', note: 'Business proportion only. If also used personally, only the business-use percentage is allowable.', partialRate: 0.5 },
  professional_fees:  { allowable: 'full',    note: 'Accountant, legal and professional fees are fully allowable.' },
  marketing:          { allowable: 'full',    note: 'Advertising and marketing costs are fully allowable.' },
  equipment:          { allowable: 'full',    note: 'Equipment used wholly for business. Annual Investment Allowance covers 100% in year of purchase.' },
  training:           { allowable: 'full',    note: 'Training to improve skills in your existing trade is allowable. Training to start a new trade is not.' },
  meals:              { allowable: 'none',    note: 'Routine meals are not allowable. Subsistence (meals away from your normal place of work on a business trip) is allowable — mark those as travel/subsistence instead. Client entertainment is never allowable against tax.' },
  other:              { allowable: 'partial', note: 'Allowability depends on the specific expense. Must be wholly and exclusively for business.' },
}
