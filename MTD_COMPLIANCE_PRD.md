# PRD: Making Tax Digital (MTD) Compliance Integration
**Product:** Freelax  
**Version:** 1.0  
**Date:** April 2026  
**Status:** Draft — For Review  

---

## 1. Executive Summary

Freelax is a UK-focused finance management platform for freelancers and contractors. Currently, Freelax helps users calculate taxes and prepare documentation for manual Self Assessment filing. It is **not yet MTD-compliant**.

This document outlines the requirements to make Freelax a fully MTD-compliant software product — enabling users to connect to HMRC, submit quarterly income and expense updates digitally, and file VAT returns without leaving the platform.

Completing this work is commercially urgent. The MTD for Income Tax Self Assessment (ITSA) mandate applies to sole traders and landlords with income over **£50,000 from April 2026** and **£30,000 from April 2027** — the core Freelax audience. Without MTD compliance, these users will be legally required to use a different product for their HMRC submissions.

---

## 2. Background

### What is Making Tax Digital?

Making Tax Digital (MTD) is HMRC's programme to move the UK tax system entirely online. It mandates that taxpayers use HMRC-approved software to keep digital records and submit tax data directly to HMRC — replacing manual Self Assessment filing.

### MTD Rollout Timeline

| Phase | Scope | Mandatory From |
|---|---|---|
| MTD for VAT | All VAT-registered businesses | April 2022 (already live) |
| MTD for ITSA — Phase 1 | Sole traders / landlords with income > £50,000 | **April 2026** |
| MTD for ITSA — Phase 2 | Sole traders / landlords with income > £30,000 | **April 2027** |
| MTD for ITSA — Phase 3 | £20,000 threshold (TBC) | TBD |

### Why This Matters for Freelax

Freelax's target users — freelancers, contractors, and small business sole traders — are the exact population HMRC is targeting first. From April 2026, any Freelax user earning over £50,000 is legally required to submit quarterly updates to HMRC using approved software. If Freelax is not on HMRC's approved software list by then, those users must switch to a competitor.

### Current State

Freelax currently provides:
- UK tax calculations (income tax, NI, VAT, dividends)
- Self Assessment export pack (Excel + receipts ZIP)
- IR35 assessment tools
- AI tax Q&A

Freelax does **not** currently:
- Connect to HMRC via OAuth
- Submit quarterly income/expense updates
- Submit VAT returns digitally
- Track submission status per period

**MTD Readiness: ~30%** — the tax calculation logic is strong, but the infrastructure for digital HMRC submission is entirely absent.

---

## 3. Goals

1. Achieve HMRC recognition as an MTD-compatible software provider (required to appear on HMRC's approved list).
2. Enable Freelax users to connect their HMRC account securely within the platform.
3. Enable quarterly MTD ITSA submissions for sole traders directly from Freelax.
4. Enable digital VAT return submissions for VAT-registered users.
5. Surface submission status clearly to users (pending, submitted, accepted, amendment required).
6. Support multi-business users (e.g. sole trader income + rental income) under a single Freelax account.

## 4. Non-Goals

- Corporation Tax / MTD for Corporation Tax (not in current MTD scope; Ltd company users are excluded from Phase 1).
- Payroll / PAYE submissions (out of scope for this phase).
- Full accountant portal / agent authorisation (future phase).
- Automated tax optimisation advice (existing AI features are sufficient for now).
- Support for non-UK tax jurisdictions.

---

## 5. User Stories

### US-01: HMRC Account Connection
> As a sole trader using Freelax, I want to connect my HMRC account so that Freelax can submit my tax data on my behalf without me needing to log in to the HMRC portal separately.

**Acceptance Criteria:**
- User can initiate HMRC OAuth from the Settings page
- HMRC OAuth flow completes and stores tokens securely
- User sees a "Connected to HMRC" status indicator
- User can disconnect their HMRC account at any time
- Expired tokens are refreshed automatically without user action

---

### US-02: Quarterly ITSA Submission
> As a sole trader, I want Freelax to prepare and submit my quarterly income and expense updates to HMRC so that I meet my MTD ITSA obligations each quarter.

**Acceptance Criteria:**
- Freelax automatically identifies the current MTD submission period (Q1–Q4)
- User can review a quarterly summary before submission
- User can trigger submission from the Tax dashboard
- Submission status is displayed (draft / submitted / accepted / amendment needed)
- User receives an in-app notification and email when HMRC accepts or rejects a submission

---

### US-03: VAT Return Submission
> As a VAT-registered sole trader, I want Freelax to prepare and submit my quarterly VAT return to HMRC so that I no longer need to use the HMRC portal or a separate tool.

**Acceptance Criteria:**
- VAT return data (Boxes 1–9) is calculated from Freelax invoice and expense records
- User can review box values before submission
- Submission is sent to HMRC MTD VAT API
- Confirmation number from HMRC is stored and displayed

---

### US-04: Submission History
> As a user, I want to see a history of all my HMRC submissions so that I have a complete audit trail.

**Acceptance Criteria:**
- Submissions page lists all periods with status and submission date
- User can download a PDF or JSON copy of any past submission
- Amendments to prior periods are clearly flagged

---

### US-05: Multi-Business Support
> As a user who has both sole trader income and rental income, I want to manage both under a single Freelax account so that I don't need separate logins.

**Acceptance Criteria:**
- User can add multiple income sources (sole trader business, rental property) from Settings
- Each income source has its own MTD submission schedule and status
- Tax calculations correctly combine income from all sources for personal allowance calculations
- HMRC connections are maintained per income source (separate UTR obligations)

---

## 6. Functional Requirements

### 6.1 HMRC OAuth Integration

| ID | Requirement |
|---|---|
| F-01 | System must implement HMRC OAuth 2.0 authorisation code flow |
| F-02 | Access tokens and refresh tokens must be stored encrypted in the database |
| F-03 | Token refresh must happen automatically before expiry |
| F-04 | OAuth callback must be handled at `/api/auth/callback/hmrc` |
| F-05 | System must support HMRC sandbox environment for testing before production launch |

### 6.2 MTD ITSA Quarterly Submissions

| ID | Requirement |
|---|---|
| F-06 | System must identify the 4 MTD ITSA quarters for each tax year (Apr–Jun, Jul–Sep, Oct–Dec, Jan–Mar) |
| F-07 | System must calculate quarterly P&L (income and allowable expenses) per period |
| F-08 | System must enforce HMRC expense allowability rules before submission (e.g. meals = disallowed) |
| F-09 | System must POST quarterly updates to HMRC Self Assessment Individuals API |
| F-10 | System must store submission ID, period, status, and timestamp for every submission |
| F-11 | System must support amendments to previously submitted periods |
| F-12 | Submission status must be polled or updated via HMRC webhook callbacks |

### 6.3 MTD VAT Returns

| ID | Requirement |
|---|---|
| F-13 | System must calculate VAT Box 1 (output VAT on sales) from invoice VAT amounts |
| F-14 | System must calculate VAT Box 4 (input VAT reclaimable) from expense VAT amounts |
| F-15 | System must calculate VAT Box 6 (net sales excluding VAT) |
| F-16 | System must calculate VAT Box 7 (net purchases excluding VAT) |
| F-17 | System must surface Boxes 2, 3, 5, 8, 9 as editable fields for EC acquisitions and manual adjustments |
| F-18 | System must POST completed VAT return to HMRC MTD VAT API |
| F-19 | VAT return submissions must be scoped to the correct VAT accounting period (not tax year) |

### 6.4 Submission Tracking

| ID | Requirement |
|---|---|
| F-20 | A submission history page must list all past and upcoming MTD obligations |
| F-21 | Each period must show status: Not Started / Draft / Submitted / Accepted / Amendment Required |
| F-22 | Users must be notified (in-app + email) of submission deadlines 7 days and 1 day in advance |
| F-23 | Users must be notified when HMRC accepts or rejects a submission |

### 6.5 Multi-Business Support

| ID | Requirement |
|---|---|
| F-24 | A user may have one or more businesses / income sources linked to their account |
| F-25 | Each business/income source has its own invoices, expenses, and MTD submission obligations |
| F-26 | Tax calculations must aggregate income across all linked businesses for personal allowance purposes |
| F-27 | Onboarding must allow users to add additional income sources after initial setup |

---

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NF-01 | HMRC OAuth tokens must be stored encrypted at rest (AES-256 or Supabase Vault) |
| NF-02 | All HMRC API calls must be made server-side; tokens must never be exposed to the client |
| NF-03 | Submission endpoints must be idempotent — re-triggering must not create duplicate HMRC submissions |
| NF-04 | The system must handle HMRC API rate limits and retry with exponential backoff |
| NF-05 | MTD submission flow must degrade gracefully if HMRC API is unavailable (queue, retry, notify user) |
| NF-06 | All MTD-related data must be retained for a minimum of 6 years (HMRC record-keeping requirement) |
| NF-07 | The platform must register as a Production MTD-compatible software vendor with HMRC before launch |

---

## 8. Technical Architecture

### 8.1 New Database Tables Required

**`oauth_connections`** — stores HMRC OAuth tokens per user
```
user_id          UUID (FK → users.id)
provider         TEXT ('hmrc')
access_token     TEXT (encrypted)
refresh_token    TEXT (encrypted)
token_expires_at TIMESTAMPTZ
hmrc_account_id  TEXT
created_at       TIMESTAMPTZ
```

**`businesses`** — separates business identity from user identity (enables multi-business)
```
id               UUID (PK)
user_id          UUID (FK → users.id)
business_name    TEXT
business_type    business_type_enum
utr_number       TEXT
vat_number       TEXT
vat_registered   BOOLEAN
is_primary       BOOLEAN
```

**`submission_periods`** — tracks each MTD quarterly submission
```
id               UUID (PK)
business_id      UUID (FK → businesses.id)
period_start     DATE
period_end       DATE
period_type      TEXT ('itsa_quarterly' | 'vat_return' | 'itsa_final')
status           TEXT ('not_started' | 'draft' | 'submitted' | 'accepted' | 'amendment_required')
hmrc_submission_id TEXT
submitted_at     TIMESTAMPTZ
income_total     NUMERIC
expenses_total   NUMERIC
profit_total     NUMERIC
```

### 8.2 Schema Changes Required

- Add `business_id` column to `invoices`, `expenses`, `clients`, `projects`, `tax_pot_entries`, `mileage_entries` tables
- Migrate existing records to a default primary business per user
- Update all Row-Level Security policies to scope by `business_id`

### 8.3 New API Routes Required

| Route | Purpose |
|---|---|
| `GET /api/auth/hmrc` | Initiates HMRC OAuth flow |
| `GET /api/auth/callback/hmrc` | Handles HMRC OAuth callback, stores tokens |
| `DELETE /api/auth/hmrc` | Disconnects HMRC account |
| `GET /api/mtd/periods` | Lists all submission periods and their status |
| `POST /api/mtd/itsa/submit` | Submits quarterly ITSA update to HMRC |
| `POST /api/mtd/vat/submit` | Submits VAT return to HMRC |
| `GET /api/mtd/itsa/preview` | Returns calculated quarterly P&L before submission |
| `GET /api/mtd/vat/preview` | Returns calculated VAT boxes before submission |
| `POST /api/webhooks/hmrc` | Receives HMRC submission status callbacks |

### 8.4 New Cron Jobs Required

| Schedule | Path | Purpose |
|---|---|---|
| Daily at 02:00 UTC | `/api/cron/hmrc-token-refresh` | Refresh HMRC OAuth tokens before expiry |
| Monthly on 1st at 06:00 UTC | `/api/cron/mtd-period-create` | Auto-create next quarter's submission period |
| As per deadline | `/api/cron/mtd-deadline-notify` | Send deadline reminders (7 days, 1 day) |

### 8.5 Key Existing Files to Modify

| File | Change Required |
|---|---|
| `lib/tax-calculations.ts` | Apply `EXPENSE_ALLOWABILITY` rules to reduce non-allowable expenses before submission |
| `types/database.ts` | Add `Business`, `OAuthConnection`, `SubmissionPeriod` types |
| `supabase-schema.sql` | Add new tables; add `business_id` to existing tables |
| `middleware.ts` | Handle HMRC token refresh transparently on expired sessions |
| `vercel.json` | Add new cron job entries |

---

## 9. Phased Delivery Plan

### Phase 1 — Foundation (Weeks 1–4)
*Goal: Schema and auth infrastructure that everything else builds on*

- [ ] Register Freelax with HMRC as an MTD software vendor (sandbox + production)
- [ ] Add `businesses` table and migrate existing users to primary business records
- [ ] Add `business_id` to all relevant tables; update RLS policies
- [ ] Add `oauth_connections` table with encrypted token storage
- [ ] Implement HMRC OAuth 2.0 flow (connect / disconnect / auto-refresh)
- [ ] Add `submission_periods` table with auto-generation logic for ITSA quarters

**Milestone:** User can connect their HMRC account from Settings. No submissions yet.

---

### Phase 2 — MTD VAT (Weeks 5–7)
*Goal: First live HMRC submission capability (VAT is simpler, already mandated, lower risk to test)*

- [ ] Build quarterly VAT Box 1, 4, 6, 7 calculation from existing invoice/expense data
- [ ] Add editable fields for Boxes 2, 3, 5, 8, 9
- [ ] Build VAT return preview page
- [ ] Implement `POST /api/mtd/vat/submit` to HMRC VAT API
- [ ] Store submission status and confirmation number
- [ ] Send in-app and email notifications on submit / acceptance / rejection

**Milestone:** VAT-registered users can submit their VAT return from Freelax.

---

### Phase 3 — MTD ITSA Quarterly (Weeks 8–11)
*Goal: Core MTD ITSA compliance before the April 2026 mandate*

- [ ] Build quarterly P&L calculation with allowability enforcement
- [ ] Build quarterly submission preview UI
- [ ] Implement `POST /api/mtd/itsa/submit` to HMRC ITSA API
- [ ] Build submission history page with period statuses
- [ ] Add deadline reminder crons (7-day and 1-day)
- [ ] Handle amendment flow for correcting past submissions

**Milestone:** Sole trader users can meet their MTD ITSA quarterly obligations from Freelax.

---

### Phase 4 — Multi-Business & Polish (Weeks 12–14)
*Goal: Support power users and ensure production readiness*

- [ ] Multi-business onboarding (add a second sole trader business or rental income source)
- [ ] Combined tax calculations across multiple income sources
- [ ] HMRC webhook receiver for async submission status updates
- [ ] End-to-end testing against HMRC production sandbox
- [ ] HMRC production approval and listing on HMRC's compatible software page

**Milestone:** Freelax listed as HMRC-approved MTD software. Full production launch.

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| HMRC API developer approval takes longer than expected | Medium | High | Apply to HMRC Developer Hub immediately; allow 4–6 weeks for approval in the plan |
| Schema migration breaks existing data | Medium | High | Run migration in a staging environment first; use Supabase migrations with rollback scripts |
| HMRC API changes between sandbox and production | Low | Medium | Follow HMRC API changelog; design HMRC client layer to be easily updated |
| Multi-business refactor introduces regressions | High | Medium | Feature-flag multi-business behind a settings toggle; release separately from ITSA submission |
| April 2026 deadline missed for Phase 1 users | Medium | High | Prioritise Phase 3 delivery; communicate timeline clearly to users ahead of mandate |

---

## 11. Success Metrics

| Metric | Target |
|---|---|
| HMRC accounts connected | 50% of eligible users (sole traders) by June 2026 |
| Quarterly ITSA submissions made via Freelax | 80% of connected users submit on time each quarter |
| VAT returns submitted via Freelax | 70% of VAT-registered users by end of Phase 2 |
| Submission failure rate | < 2% (HMRC rejection due to data errors) |
| User support tickets related to MTD | < 5 per week at steady state |

---

## 12. Open Questions

1. **HMRC Agent Authorisation** — Should Freelax support accountant agents submitting on behalf of clients in Phase 1, or defer to Phase 5?
2. **Landlord Income** — MTD ITSA Phase 2 includes landlords. Should we add a `rental` income source type ahead of Phase 2, or wait?
3. **Flat Rate VAT Scheme** — The codebase currently assumes standard VAT. Do we need to support flat rate and cash accounting VAT schemes at launch?
4. **Pricing** — Should MTD submission capability be available on all plans, or gated to Solo and above?
5. **Data Retention** — HMRC requires 6-year record retention. Does our current Supabase plan and data deletion policy comply?

---

## Appendix: Relevant HMRC API Documentation

- MTD ITSA API: `developer.service.hmrc.gov.uk/api-documentation/docs/api/service/self-assessment-api`
- MTD VAT API: `developer.service.hmrc.gov.uk/api-documentation/docs/api/service/vat-api`
- HMRC OAuth 2.0: `developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints`
- Approved Software Register: `gov.uk/guidance/use-making-tax-digital-compatible-software`
- HMRC Sandbox: `test-api.service.hmrc.gov.uk`

---

*Document prepared by: Freelax Engineering*  
*For questions, contact: support@freelax.co.uk*
