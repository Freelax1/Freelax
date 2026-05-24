'use client'

import { useState } from 'react'
import InfoTooltip from '@/components/info-tooltip'
import Alert from '@/components/ui/alert'
import { Field, Input, Select, SaveSettingsButton } from './shared'

interface Props {
  profile: any
  save: (data: Record<string, any>) => Promise<void>
  saving: boolean
}

export default function TaxTab({ profile, save, saving }: Props) {
  const [tp, setTp] = useState({
    student_loan_plan:           profile?.student_loan_plan           ?? 'none',
    pension_contributions:       profile?.pension_contributions       ?? '',
    salary_drawn:                profile?.salary_drawn                ?? '',
    dividends_drawn:             profile?.dividends_drawn             ?? '',
    monthly_personal_outgoings:  profile?.monthly_personal_outgoings  ?? '',
    other_income:                profile?.other_income                ?? '',
    investment_dividends:        profile?.investment_dividends        ?? '',
  })

  return (
    <div className="space-y-4">
      <div className="space-y-5">
        <div>
          <h2 className="font-semibold text-text-primary">Tax profile</h2>
          <p className="text-sm text-text-muted mt-1">
            These details make your tax estimates accurate. None of this is sent to HMRC — it's used only to calculate your take-home and tax pot.
          </p>
        </div>

        <Field
          label="Typical monthly personal outgoings (£)"
          hint="Rent/mortgage, food, bills, subscriptions — the fixed cost of your life. Used to calculate 'Safe to spend' on your dashboard."
        >
          <Input
            type="number"
            min="0"
            step="100"
            value={tp.monthly_personal_outgoings}
            onChange={e => setTp(p => ({ ...p, monthly_personal_outgoings: e.target.value }))}
            placeholder="e.g. 2500"
          />
        </Field>

        <Field label={<span>Student loan<InfoTooltip>Repayments at 9% on income over £29,385 per year (Plan 2). Most post-2012 UK undergraduates have Plan 2. Deducted automatically through Self Assessment.</InfoTooltip></span>} hint="Affects how much is deducted from your take-home through Self Assessment">
          <Select value={tp.student_loan_plan} onChange={e => setTp(p => ({ ...p, student_loan_plan: e.target.value }))}>
            <option value="none">No student loan</option>
            <option value="plan1">Plan 1 — started before Sep 2012 (threshold £24,990)</option>
            <option value="plan2">Plan 2 — started Sep 2012–Jul 2023 (threshold £27,295)</option>
            <option value="plan4">Plan 4 — Scottish loans (threshold £31,395)</option>
            <option value="plan5">Plan 5 — started Aug 2023+ (threshold £25,000)</option>
            <option value="postgrad">Postgraduate loan (threshold £21,000)</option>
          </Select>
        </Field>

        <Field
          label={<span>Annual pension contributions (£)<InfoTooltip>Contributions to a SIPP or personal pension reduce your taxable income pound-for-pound — the single biggest legal tax saving available to freelancers.</InfoTooltip></span>}
          hint="Contributions to a SIPP or personal pension. These reduce your taxable income and extend your basic rate band — the single biggest legal tax saving available to freelancers."
        >
          <Input
            type="number"
            min="0"
            step="100"
            value={tp.pension_contributions}
            onChange={e => setTp(p => ({ ...p, pension_contributions: e.target.value }))}
            placeholder="0"
          />
        </Field>

        {profile?.business_type === 'limited_company' && (
          <>
            <Alert intent="info" className="p-3 text-xs">
              As a limited company director, enter the salary and dividends you actually draw. This gives you an accurate personal tax calculation separate from your company's corporation tax.
            </Alert>
            <Field
              label="Annual director salary (£)"
              hint="Most tax-efficient is usually £12,570 (Personal Allowance) or £5,000 (below NI threshold). Talk to your accountant."
            >
              <Input
                type="number"
                min="0"
                step="100"
                value={tp.salary_drawn}
                onChange={e => setTp(p => ({ ...p, salary_drawn: e.target.value }))}
                placeholder="12570"
              />
            </Field>
            <Field
              label={<span>Annual dividends drawn (£)<InfoTooltip>Dividends from your company are taxed at lower rates than salary. First £500 is free, then 10.75% / 35.75% / 39.35% depending on your tax band.</InfoTooltip></span>}
              hint="Dividends are taxed at lower rates than salary (10.75% / 35.75% / 39.35%) with a £500 tax-free allowance."
            >
              <Input
                type="number"
                min="0"
                step="100"
                value={tp.dividends_drawn}
                onChange={e => setTp(p => ({ ...p, dividends_drawn: e.target.value }))}
                placeholder="0"
              />
            </Field>
          </>
        )}

        <Field
          label="Other income (annual, £)"
          hint="PAYE employment, rental income, savings interest or any other taxable income outside your freelance work."
        >
          <Input
            type="number"
            min="0"
            step="100"
            value={tp.other_income}
            onChange={e => setTp(p => ({ ...p, other_income: e.target.value }))}
            placeholder="0"
          />
        </Field>

        {profile?.business_type === 'sole_trader' && (
          <Field
            label="Investment dividends (annual, £)"
            hint="Dividends from shares, funds or investment ISAs. Not dividends from your own limited company."
          >
            <Input
              type="number"
              min="0"
              step="100"
              value={tp.investment_dividends}
              onChange={e => setTp(p => ({ ...p, investment_dividends: e.target.value }))}
              placeholder="0"
            />
          </Field>
        )}

        <SaveSettingsButton
          saving={saving}
          label="Save tax profile"
          onClick={() => save({
            student_loan_plan: tp.student_loan_plan,
            pension_contributions: Number(tp.pension_contributions) || 0,
            salary_drawn: tp.salary_drawn !== '' ? Number(tp.salary_drawn) : null,
            dividends_drawn: tp.dividends_drawn !== '' ? Number(tp.dividends_drawn) : null,
            monthly_personal_outgoings: tp.monthly_personal_outgoings !== '' ? Number(tp.monthly_personal_outgoings) : null,
            other_income: tp.other_income !== '' ? Number(tp.other_income) : 0,
            investment_dividends: tp.investment_dividends !== '' ? Number(tp.investment_dividends) : 0,
          })}
        />
      </div>

      <div className="bg-surface-sunken rounded-xl border border-border-subtle p-4 text-xs text-text-muted leading-relaxed">
        <p className="font-medium text-text-secondary mb-1">Why does this matter?</p>
        <p>Without these details, Freelax can only estimate basic Income Tax and NI. With them, it calculates your actual take-home after student loan, pension, and for Ltd company directors — the difference between salary and dividend tax. The more accurate your profile, the better your cash flow planning.</p>
      </div>
    </div>
  )
}
