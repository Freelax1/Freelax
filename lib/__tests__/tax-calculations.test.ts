import { calculateTax } from '../tax-calculations'

// Worked examples are ported from the methodology PDF. Values assume the
// 2026/27 tax year. Where the PDF's numbers were computed with old rates,
// this file encodes the CURRENT-CODE values and flags the delta inline —
// same "stale rate label" class of bug we already hit with dividend tooltips.

describe('Sarah — sole trader, full worked example', () => {
  // grossIncome £80k, expenses £8k, £4k pension, Plan 2 student loan.
  const r = calculateTax({
    grossIncome: 80_000,
    totalExpenses: 8_000,
    businessType: 'sole_trader',
    pensionContributions: 4_000,
    studentLoanPlan: 'plan2',
  })
  if (r.kind !== 'sole_trader') throw new Error('expected sole_trader')

  test('net profit = £72,000', () => {
    expect(r.netProfit).toBe(72_000)
  })
  test('income tax = £15,432', () => {
    expect(r.incomeTax).toBe(15_432)
  })
  test('Class 4 NI = £2,697', () => {
    expect(r.classFourNI).toBe(2_697)
  })
  test('student loan (Plan 2) = £3,835', () => {
    expect(r.studentLoanRepayment).toBe(3_835)
  })
  test('total tax = £21,964', () => {
    expect(r.totalTax).toBe(21_964)
  })
  test('take-home = £46,036', () => {
    expect(r.takeHome).toBe(46_036)
  })
  test('payments on account (Jan & Jul) = £9,065 each', () => {
    expect(r.paymentsOnAccount).toBe(9_065)
    expect(r.julyPayment).toBe(9_065)
  })
})

describe('James — Ltd company, full worked example', () => {
  // grossIncome £100k, expenses £5k, £12,570 salary, full distributable dividends.
  //
  // The methodology PDF's Ltd figures (employerNI £1,045 / companyProfit £81,385
  // / corpTax £17,817 / profitAfterCorpTax £63,568 / divTax £13,122) were computed
  // at the OLD 13.8% Employer NI rate. The engine uses 15% (Autumn Budget 2024,
  // effective 6 Apr 2025, unchanged for 2026/27). These tests assert the
  // current-code values — the PDF is the thing that needs updating, not the code.
  const r = calculateTax({
    grossIncome: 100_000,
    totalExpenses: 5_000,
    businessType: 'limited_company',
    salaryDrawn: 12_570,
    dividendsDrawn: 1_000_000, // oversized — engine caps to distributable profit
  })
  if (r.kind !== 'limited_company') throw new Error('expected limited_company')

  test('employer NI at 15% = £1,136', () => {
    expect(r.employerNI).toBe(1_136)
  })
  test('company profit = £81,295', () => {
    expect(r.companyProfit).toBe(81_295)
  })
  test('corporation tax with marginal relief = £17,793', () => {
    expect(r.corporationTax).toBe(17_793)
  })
  test('profit after corp tax = £63,501', () => {
    expect(r.profitAfterCorpTax).toBe(63_501)
  })
  test('dividend tax = £13,098', () => {
    expect(r.dividendTax).toBe(13_098)
  })
  test('effective combined tax rate ≈ 32%', () => {
    expect(r.effectiveTaxRate).toBeCloseTo(32.0, 1)
  })
})

describe('Personal Allowance taper', () => {
  test('PA = £0 at £130k net profit (fully tapered)', () => {
    const r = calculateTax({
      grossIncome: 130_000,
      totalExpenses: 0,
      businessType: 'sole_trader',
    })
    if (r.kind !== 'sole_trader') throw new Error('expected sole_trader')
    expect(r.personalAllowance).toBe(0)
    expect(r.paAlert).toBe(true)
  })

  test('PA = £7,570 at £110k net profit (reduction of £5,000)', () => {
    // Taper halves £1 per £2 above £100k → £10k over × 0.5 = £5k reduction.
    const r = calculateTax({
      grossIncome: 110_000,
      totalExpenses: 0,
      businessType: 'sole_trader',
    })
    if (r.kind !== 'sole_trader') throw new Error('expected sole_trader')
    expect(r.personalAllowance).toBe(7_570)
    expect(r.paAlert).toBe(true)
  })
})

describe('Pension band extension', () => {
  test('£4,000 pension at £63,430 taxable income → £800 higher-rate relief', () => {
    // netProfit £76k → taxableIncome £63,430 post-PA.
    // All £4,000 of pension sits inside the higher band, so extra relief is
    // £4,000 × (40% − 20%) = £800. Not £0 (basic-rate-only), not £1,600 (full 40%).
    const r = calculateTax({
      grossIncome: 76_000,
      totalExpenses: 0,
      businessType: 'sole_trader',
      pensionContributions: 4_000,
    })
    if (r.kind !== 'sole_trader') throw new Error('expected sole_trader')
    expect(r.taxableIncome).toBe(63_430)
    expect(r.higherRatePensionRelief).toBe(800)
    expect(r.additionalRatePensionRelief).toBe(0)
    expect(r.totalExtraReliefViaSA).toBe(800)
  })
})

describe('Dividend stacking (Ltd, salary at PA)', () => {
  test('£63,068 taxable dividends split basic-first, then higher', () => {
    // Salary £12,570 consumes the full PA, leaving £37,700 of basic band free.
    // Dividends £63,568 gross → taxable £63,068 after allowance:
    //   basic portion  £37,700 × 10.75% = £4,052.75
    //   higher portion £25,368 × 35.75% = £9,069.06
    //   total ≈ £13,121.81 → rounds to £13,122
    // grossIncome chosen so profitAfterCorpTax comfortably exceeds £63,568
    // (otherwise the engine caps dividends to distributable profit).
    const r = calculateTax({
      grossIncome: 110_000,
      totalExpenses: 5_000,
      businessType: 'limited_company',
      salaryDrawn: 12_570,
      dividendsDrawn: 63_568,
    })
    if (r.kind !== 'limited_company') throw new Error('expected limited_company')
    expect(r.taxableDividends).toBe(63_068)
    expect(r.dividendTax).toBe(13_122)
  })
})

describe('Payments on Account trigger', () => {
  test('SA bill £999 → POA £0 (below trigger)', () => {
    // netProfit £16,412 → IT £768 + C4 NI £231 = £999.
    const r = calculateTax({
      grossIncome: 16_412,
      totalExpenses: 0,
      businessType: 'sole_trader',
    })
    if (r.kind !== 'sole_trader') throw new Error('expected sole_trader')
    expect(r.incomeTax + r.classFourNI).toBe(999)
    expect(r.paymentsOnAccount).toBe(0)
    expect(r.julyPayment).toBe(0)
  })

  test('SA bill £1,000 → POA £500 (trigger fires)', () => {
    // netProfit £16,415 → IT £769 + C4 NI £231 = £1,000; POA = £500.
    // Spec said saBill £1,001 → POA £500, but Math.round(1001/2) = 501.
    // £1,000 is the cleanest boundary: proves POA kicks in at the threshold
    // and is exactly half the bill.
    const r = calculateTax({
      grossIncome: 16_415,
      totalExpenses: 0,
      businessType: 'sole_trader',
    })
    if (r.kind !== 'sole_trader') throw new Error('expected sole_trader')
    expect(r.incomeTax + r.classFourNI).toBe(1_000)
    expect(r.paymentsOnAccount).toBe(500)
    expect(r.julyPayment).toBe(500)
  })
})

describe('Regression guard: Employer NI rate lock', () => {
  test('uses 15% (Autumn Budget 2024), not the old 13.8%', () => {
    // £12,570 salary leaves £7,570 above the £5,000 Secondary Threshold.
    //   @ 15%   → £1,135.50 → rounds to £1,136  (current, correct)
    //   @ 13.8% → £1,044.66 → rounds to £1,045  (pre-April-2025, stale)
    // If this test ever starts asserting £1,045, someone has silently reverted
    // the ER NI rate — the same drift pattern that made the methodology PDF stale.
    const r = calculateTax({
      grossIncome: 100_000,
      totalExpenses: 5_000,
      businessType: 'limited_company',
      salaryDrawn: 12_570,
    })
    if (r.kind !== 'limited_company') throw new Error('expected limited_company')
    expect(r.employerNI).toBe(1_136)
    expect(r.employerNI).not.toBe(1_045)
  })
})

describe('POA excludes student loan from its basis', () => {
  test('POA computed from IT + NI only, not IT + NI + student loan', () => {
    // netProfit £50k + Plan 2 → IT+NI ≈ £9,732; student loan ≈ £1,855.
    // Correct POA ≈ £4,866 (half of £9,732).
    // Wrong POA (if student loan were included) ≈ £5,794.
    const r = calculateTax({
      grossIncome: 50_000,
      totalExpenses: 0,
      businessType: 'sole_trader',
      studentLoanPlan: 'plan2',
    })
    if (r.kind !== 'sole_trader') throw new Error('expected sole_trader')
    const itPlusNi = r.incomeTax + r.classFourNI
    const wrongPoa = Math.round((itPlusNi + r.studentLoanRepayment) / 2)
    expect(r.studentLoanRepayment).toBeGreaterThan(0) // guard: student loan actually fired
    expect(r.paymentsOnAccount).toBe(Math.round(itPlusNi / 2))
    expect(r.paymentsOnAccount).not.toBe(wrongPoa)
  })
})
