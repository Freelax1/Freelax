// ─────────────────────────────────────────────────────────────────────────────
// Freelax — Database & Domain Types v1.1
// ─────────────────────────────────────────────────────────────────────────────

export type BusinessType     = 'sole_trader' | 'limited_company' | 'partnership'
export type VatScheme        = 'standard' | 'flat_rate' | 'cash'
export type SubscriptionPlan = 'free' | 'solo' | 'pro' | 'studio'
export type ClientStatus     = 'active' | 'paused' | 'archived'
export type ProjectStatus    = 'active' | 'completed' | 'on_hold' | 'cancelled'
export type RateType         = 'fixed' | 'day_rate' | 'hourly'
export type IR35Status       = 'outside_ir35' | 'inside_ir35' | 'needs_review'
export type InvoiceStatus    = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type StudentLoanPlan  = 'none' | 'plan1' | 'plan2' | 'plan4' | 'plan5' | 'postgrad'

export type ExpenseCategory =
  | 'office_supplies'
  | 'travel'
  | 'software'
  | 'phone_internet'
  | 'professional_fees'
  | 'marketing'
  | 'equipment'
  | 'training'
  | 'meals'
  | 'other'

export interface User {
  id: string
  email: string
  full_name: string | null
  business_name: string | null
  business_type: BusinessType
  vat_registered: boolean
  vat_number: string | null
  vat_scheme: VatScheme
  utr_number: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  postcode: string | null
  phone: string | null
  logo_url: string | null

  // Tax profile — used for accurate take-home calculations
  monthly_expenses_estimate:  number | null  // monthly business costs (software, travel, etc.)
  monthly_personal_outgoings: number | null  // monthly personal costs (rent, food, bills)
  student_loan_plan: StudentLoanPlan | null
  pension_contributions: number | null   // annual SIPP contributions
  salary_drawn: number | null            // Ltd company: director salary
  dividends_drawn: number | null         // Ltd company: dividends taken

  // Banking
  bank_account_name: string | null
  bank_sort_code: string | null
  bank_account_number: string | null
  bank_reference_note: string | null

  // Stripe / subscription
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_plan: SubscriptionPlan
  subscription_status: string

  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  user_id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  postcode: string | null
  country: string
  status: ClientStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  client_id: string | null
  title: string
  description: string | null
  status: ProjectStatus
  rate_type: RateType | null
  rate_amount: number | null
  start_date: string | null
  end_date: string | null
  ir35_status: IR35Status
  ir35_answers: IR35Answer[] | null
  ir35_assessed_at: string | null
  created_at: string
  updated_at: string
  // joined (Supabase returns keyed by table name)
  clients?: Client | null
  // alias (some code uses this)
  client?: Client
}

export interface Invoice {
  id: string
  user_id: string
  client_id: string | null
  project_id: string | null
  invoice_number: string
  status: InvoiceStatus
  issue_date: string
  due_date: string
  paid_date: string | null
  subtotal: number
  vat_amount: number
  total: number
  notes: string | null
  payment_terms: string
  stripe_payment_link: string | null
  sent_at: string | null
  chase_log: ChaseEntry[] | null
  public_token: string | null
  created_at: string
  updated_at: string
  // joined (Supabase returns data keyed by the actual table name)
  clients?: Client | null
  users?: User | null
  projects?: Project | null
  invoice_line_items?: InvoiceLineItem[]
  // aliases (some code uses these)
  client?: Client
  project?: Project
  line_items?: InvoiceLineItem[]
}

export interface ChaseEntry {
  chased_at: string
  note: string | null
}

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
  line_total: number
  created_at: string
}

export interface Expense {
  id: string
  user_id: string
  date: string
  merchant: string
  description: string | null
  category: ExpenseCategory
  amount: number
  vat_amount: number
  vat_reclaimable: boolean
  receipt_url: string | null
  ai_scanned: boolean
  created_at: string
  updated_at: string
}

export interface IR35Assessment {
  id: string
  project_id: string
  user_id: string
  answers: IR35Answer[]
  status: IR35Status
  ai_explanation: string | null
  ai_risk_factors: string[] | null
  ai_recommendations: string[] | null
  assessed_at: string
}

export interface IR35Answer {
  question_number: number
  value: boolean
  importance: 'HIGH' | 'MED'
}

// ── Tax calculation result types (re-exported from lib/tax-calculations) ──────

export interface SimpleTaxCalculation {
  incomeTax: number
  classFourNI: number
  total: number
}

// Legacy alias — used in dashboard and other components that only need the basic figures
export type TaxCalculation = SimpleTaxCalculation

export interface SoleTraderTaxDetail {
  kind: 'sole_trader'
  grossIncome: number
  totalExpenses: number
  netProfit: number
  personalAllowance: number
  taxableIncome: number
  basicRateTax: number
  higherRateTax: number
  additionalRateTax: number
  incomeTax: number
  classFourNI: number
  studentLoanRepayment: number
  otherIncome: number
  investmentDividends: number
  investmentDividendTax: number
  pensionContributions: number
  pensionTaxRelief: number
  paymentsOnAccount: number
  totalJanuaryPayment: number
  julyPayment: number
  totalTax: number
  totalDeductions: number
  takeHome: number
  effectiveTaxRate: number
  paAlert: boolean
  higherRateAlert: boolean
}

export interface LtdCompanyTaxDetail {
  kind: 'limited_company'
  grossIncome: number
  totalExpenses: number
  companyProfit: number
  corporationTax: number
  corporationTaxRate: number
  profitAfterCorpTax: number
  salaryDrawn: number
  salaryIncomeTax: number
  employeeNI: number
  employerNI: number
  dividendsDrawn: number
  dividendAllowance: number
  taxableDividends: number
  dividendTax: number
  studentLoanRepayment: number
  otherIncome: number
  pensionContributions: number
  paymentsOnAccount: number
  totalJanuaryPayment: number
  julyPayment: number
  totalPersonalTax: number
  totalCompanyTax: number
  takeHome: number
  effectiveTaxRate: number
  retainedProfit: number
}

export type TaxDetail = SoleTraderTaxDetail | LtdCompanyTaxDetail

// ── AI response types ─────────────────────────────────────────────────────────

export interface ScannedReceipt {
  date: string | null
  merchant: string | null
  amount_ex_vat: number | null
  vat_amount: number | null
  category: ExpenseCategory | null
  description: string | null
  confidence: 'high' | 'medium' | 'low'
}

export interface IR35AIExplanation {
  verdict: string
  risk_level: 'Low' | 'Medium' | 'High'
  risk_level_explanation: string
  next_steps: string[]
}

export interface InvoiceAssistResult {
  line_items: {
    description: string
    quantity: number
    unit_price: number
    vat_rate: number
  }[]
  suggested_payment_terms: string
  notes: string | null
}

// ── Quotes ────────────────────────────────────────────────────────────────────

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'

export interface Quote {
  id: string
  user_id: string
  client_id: string | null
  project_id: string | null
  quote_number: string
  status: QuoteStatus
  issue_date: string
  expiry_date: string | null
  subtotal: number
  vat_amount: number
  total: number
  notes: string | null
  public_token: string | null
  accepted_at: string | null
  declined_at: string | null
  sent_at: string | null
  converted_invoice_id: string | null
  created_at: string
  updated_at: string
  // joined
  clients?: Client | null
  client?: Client | null
  project?: Project | null
  projects?: Project | null
  quote_line_items?: QuoteLineItem[]
  users?: User | null
}

export interface QuoteLineItem {
  id: string
  quote_id: string
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
  line_total: number
  created_at: string
}

// ── Activity logs ─────────────────────────────────────────────────────────────

export type InvoiceActivityAction =
  | 'sent' | 'paid' | 'chased' | 'status_changed' | 'overdue'

export type QuoteActivityAction =
  | 'sent' | 'accepted' | 'declined' | 'expired' | 'status_changed'

export interface InvoiceActivity {
  id: string
  invoice_id: string
  user_id: string
  action: InvoiceActivityAction
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface QuoteActivity {
  id: string
  quote_id: string
  user_id: string
  action: QuoteActivityAction
  metadata: Record<string, unknown> | null
  created_at: string
}

// ── Other tables ──────────────────────────────────────────────────────────────

export interface TaxPotEntry {
  id: string
  user_id: string
  amount: number
  note: string | null
  date: string
  tax_year_start: number
  created_at: string
}

export interface MileageEntry {
  id: string
  user_id: string
  date: string
  description: string
  from_location: string | null
  to_location: string | null
  miles: number
  purpose: string | null
  tax_year_start: number
  created_at: string
}

export interface AccountantInvite {
  id: string
  owner_id: string
  email: string
  token: string
  accepted_at: string | null
  revoked_at: string | null
  created_at: string
}

export interface InvoiceTemplate {
  id: string
  user_id: string
  client_id: string | null
  frequency: 'weekly' | 'monthly' | 'quarterly'
  next_run_date: string
  line_items: Array<Pick<InvoiceLineItem, 'description' | 'quantity' | 'unit_price' | 'vat_rate'>>
  payment_terms: string
  notes: string | null
  active: boolean
  created_at: string
  updated_at: string
}
