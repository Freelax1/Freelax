# Freelax — Product Vision & Business Strategy
**Version:** 1.0
**Date:** May 2026
**Status:** Draft

---

## 1. The One-Liner

**Freelax is the finance and tax platform built for one person — the UK freelancer.**

It replaces the spreadsheet, the shoebox of receipts, and the January panic with a single app that always knows what you've earned, what you owe, and what you can spend.

---

## 2. The Problem

Three million people in the UK work for themselves. Every one of them has to do their own books, calculate their own tax, and file their own Self Assessment — and almost none of them are accountants.

Today, they cope by stitching together tools that weren't built for them:

- **Spreadsheets** — flexible but error-prone; no link to HMRC; useless for VAT.
- **Generic accounting software** (Xero, QuickBooks) — built for businesses with employees, payroll, and a bookkeeper. Overkill, overpriced, and full of language a freelancer doesn't speak ("chart of accounts", "trial balance", "journals").
- **Shoeboxes and Google Drive folders** — receipts pile up; categorisation happens once a year, badly.
- **An accountant on retainer** — solves it, but costs £600–£1,500 a year that a £40k freelancer can't comfortably spare.

The result is that most freelancers operate without a real-time picture of their finances. They don't know what they owe HMRC until they file. They under- or over-save for tax. They miss legitimate deductions. And they spend two stressful weekends in January doing a year's worth of bookkeeping at once.

On top of all that, **the rules are changing**. From April 2026, HMRC's Making Tax Digital (MTD) mandate forces sole traders earning over £50,000 to submit quarterly updates digitally, through approved software. Spreadsheets become illegal. Shoeboxes become illegal. The freelancer has to pick a tool — and the obvious options are aimed at businesses ten times their size.

---

## 3. The Product

Freelax is a web app (and PWA) that does four things, all designed around how a single self-employed person actually works:

### 3.1 It tracks money in
Send invoices and quotes that look professional, get paid online via Stripe, chase late payers automatically, and handle recurring clients without thinking about it.

### 3.2 It tracks money out
Snap a photo of any receipt; AI reads the merchant, amount, and category in seconds. Log mileage at HMRC-approved rates. Tag spend to clients and projects so the freelancer can see which work is actually profitable.

### 3.3 It does the tax maths in real time
Every invoice raised and every receipt logged updates a live tax forecast — income tax, National Insurance, VAT, dividends, personal allowance taper, the lot. The user sees, on any given Tuesday in October, exactly what they owe and what they can safely spend. No more January surprises.

### 3.4 It files (or prepares to file) with HMRC
Today, Freelax produces a Self Assessment pack — an Excel workbook plus all receipts in a ZIP — that the user (or their accountant) can submit. From April 2026, Freelax will submit quarterly MTD updates and VAT returns directly to HMRC from inside the app.

Underneath the four pillars, two cross-cutting capabilities differentiate Freelax:

- **AI that knows the user's data.** A built-in Claude-powered assistant answers tax questions ("can I claim my home office?", "what's my profit this quarter?") grounded in the user's own books — not generic web answers.
- **IR35 tooling for contractors.** A weighted questionnaire with plain-English explainers gives contractors an inside/outside status assessment per engagement, stamped onto the project record.

---

## 4. How Freelax Solves the Problem

| Pain | Today | With Freelax |
|---|---|---|
| "I don't know what I owe in tax" | Find out in January | Live tax dashboard, updated with every transaction |
| "I lose receipts" | Shoebox or 'Receipts' folder | Photo → AI extracts → stored against the right expense |
| "Bookkeeping eats my weekends" | Two days every January | 30 seconds per transaction, year-round |
| "Xero is too much" | Pay £30/mo for features I'll never use | Pay £9–£19/mo for only what a freelancer needs |
| "I don't know if I'm inside IR35" | Guess, or pay £150 for an assessment | Built-in questionnaire with reasoning |
| "MTD is going to force me onto new software" | Switch reluctantly to a generic tool | Stay on the freelancer-native tool that's already MTD-ready |
| "My accountant charges me to tidy my mess" | Pay for cleanup time | Hand them a clean SA pack — or read-only access |

The thesis: the freelancer doesn't need a smaller version of Xero. They need a **different** product, designed around their workflow (project-based work, single bank account, irregular income, IR35 risk, end-of-year SA filing) and their language (no journals, no nominal codes — just income, expenses, and tax).

---

## 5. Who It's For

### 5.1 Primary audience — UK sole traders & freelancers

The core user. Earnings £20k–£150k/year, working alone, billing clients directly. Trades include:

- **Creative & digital** — designers, developers, writers, photographers, video editors, marketers.
- **Consulting & professional services** — independent consultants, coaches, trainers, therapists.
- **Skilled trades** — electricians, plumbers, builders, gardeners working as sole traders.
- **Health & wellbeing** — personal trainers, instructors, private practitioners.

What unites them: one person, doing the work and the books; no payroll; no employees; UK-based; HMRC-registered as self-employed.

### 5.2 Secondary audience — Single-director limited company contractors

Contractors operating through their own Ltd, typically in tech, engineering, finance, or interim management. Earnings £60k–£200k/day-rate equivalent. They care intensely about IR35 status and dividend-vs-salary optimisation, and they're underserved by both Xero (too generic) and FreeAgent (closer fit, but still business-shaped).

### 5.3 Tertiary audience — Accountants

Small UK accountancy practices that serve freelancer clients. Freelax gives them read access to their clients' books, clean SA exports, and (with MTD) a way to oversee submissions without re-keying data. They are a distribution channel as much as a user — an accountant who recommends Freelax to ten clients is worth far more than one direct signup.

### 5.4 Who Freelax is **not** for
- Multi-employee businesses with payroll.
- Companies needing multi-currency or double-entry bookkeeping.
- Non-UK users — the tax engine is UK-specific.
- Anyone whose accountant currently does everything for them and who wants to keep it that way.

---

## 6. Why Now

Three forces converge in 2026 to make this the right moment:

1. **Regulation forces a switch.** MTD ITSA mandates digital filing from April 2026 (£50k+) and April 2027 (£30k+). Every freelancer in the target market has to pick a tool. The default winner is whoever is on HMRC's recognised list **and** speaks the freelancer's language.
2. **AI changes the unit economics of bookkeeping.** Receipt OCR, transaction categorisation, and tax Q&A used to require either human bookkeepers or expensive ML pipelines. With Claude and similar models, a £9/month product can deliver capability that previously required a £600/year accountant.
3. **Self-employment is structurally growing.** The UK has more sole traders than at any point in modern history; the cohort is younger, more digital-native, and more comfortable paying for SaaS than the generation before it.

Getting on HMRC's recognised software list before April 2026 is the single most leveraged thing the company can do. After that date, every non-recognised tool is locked out of the largest mandatory software switch in UK tax history.

---

## 7. Business Goals

### 7.1 12-month goals (to May 2027)
- **5,000 paying users** across Solo and Pro tiers.
- **MTD ITSA recognised by HMRC** before April 2026; first 1,000 quarterly submissions filed via Freelax by July 2026.
- **£500k ARR.**
- **8% free-to-paid conversion.**
- **<3% monthly churn** on paid plans.

### 7.2 36-month goals (to May 2029)
- **50,000 paying users.** ~1.5% of the addressable UK sole-trader market.
- **£6M ARR.**
- **Top-3 freelancer-focused finance tool in the UK** by share of voice and accountant referrals.
- **Open Banking and bank-feed ingestion** as a default feature.
- **Profitability** at the unit-economics level (gross margin > 80%, payback < 9 months).

### 7.3 Long-term ambition (5+ years)
Become the default financial operating system for UK self-employment — invoicing, tax, savings, pension, lending — for the three million people HMRC counts as sole traders today and the millions more the gig economy will add.

---

## 8. Product Goals

These are the things the product has to be true about, not just have:

1. **Trustworthy tax numbers.** A user must be able to bet their Self Assessment on the figure Freelax shows. This is non-negotiable; a single high-profile miscalculation would be terminal.
2. **Five-minute first invoice.** A new user signing up on a Tuesday should be able to send a real, branded invoice to a real client by Tuesday lunchtime.
3. **Bookkeeping in seconds, not weekends.** Logging an expense — including the receipt — should take under 30 seconds, every time.
4. **MTD-compliant before the deadline.** Freelax must be recognised by HMRC and submitting in production before April 2026.
5. **AI that's helpful, not hand-wavy.** Every AI answer must be grounded in either UK tax rules or the user's own data — never generic web hallucination — and clearly disclaim when it's an opinion.
6. **No accountant required, but loved by accountants.** A user should be able to file alone if they want to, **and** hand off cleanly if they don't.

---

## 9. How We Win

Freelax doesn't win by being a cheaper Xero. It wins by being a **different shape of product**.

- **Positioning:** "Built for one." Every screen, every word, every default assumes a single self-employed person. Nothing about teams, employees, payroll, or multi-entity. That clarity is the moat.
- **Distribution:** Three channels in priority order:
  1. **Accountant referrals** — small UK practices recommending Freelax to clients in exchange for a free seat.
  2. **SEO & content** — UK tax explainers, IR35 guides, MTD readiness checkers; high intent, low CAC.
  3. **Community** — freelancer subreddits, contractor forums, indie maker spaces; product-led growth via free tier.
- **Pricing:** Affordable enough to be a no-brainer (£9–£19/mo) versus £600+/year accountant fees, with a free tier that does enough to be useful but not enough to file SA.
- **Compliance as a feature, not a tax:** MTD recognition is sold as the killer feature in 2026, not buried in a footer.

---

## 10. What Could Kill This

| Risk | Why it matters |
|---|---|
| Missing MTD recognition before April 2026 | Existential — every paying user with > £50k income is legally forced onto a competitor. |
| A wrong tax number reaching a user | Trust collapse; one viral Reddit post is enough. |
| HMRC delays the mandate again | Removes the urgency that drives switching; we still have a great product but a slower market. |
| Xero or FreeAgent ships a credible "sole trader" mode | They have distribution and brand; speed and focus are our only defences. |
| AI cost per user grows faster than ARPU | Receipt OCR and Q&A run on every active user; pricing has to keep pace with token cost. |
| Open Banking integration delayed | Manual entry friction caps how habitual the product becomes. |

The strategy assumes regulatory tailwinds (MTD) and AI cost curves continue in our favour. If either reverses, the plan needs to change.

---

## 11. The North-Star Metric

**Number of UK Self Assessments filed (or MTD-submitted) using Freelax in a given tax year.**

Everything else — signups, MAU, ARR — is upstream of that one number. If Freelax files 10,000 SAs in 2026/27, the business works. If it files 100, it doesn't, no matter how good the dashboard looks.

---

## 12. In One Paragraph

The UK has three million self-employed people who are about to be legally required to switch to digital tax software. Existing tools were built for businesses, not freelancers. Freelax is the freelancer-native option — invoicing, expenses, real-time tax, IR35, AI bookkeeping, and (from April 2026) direct MTD submission to HMRC — at a price a sole trader can afford. The product wins by being deliberately, unapologetically built for one person, in a market where everyone else is building for ten.
