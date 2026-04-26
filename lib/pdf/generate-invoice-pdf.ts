// lib/pdf/generate-invoice-pdf.ts
import { formatCurrency } from '@/lib/tax-calculations'

export function buildInvoiceHtml(invoice: any, withPrintScript = false): string {
  const client    = invoice.clients           as any
  const sender    = invoice.users             as any
  const project   = (invoice.projects ?? null) as any
  const lineItems = (invoice.invoice_line_items ?? []) as any[]

  const rows = lineItems.map((item: any) => `
    <tr>
      <td class="td-desc">${item.description}</td>
      <td class="td-num">${item.quantity}</td>
      <td class="td-num">${formatCurrency(item.unit_price)}</td>
      <td class="td-vat">${item.vat_rate}%</td>
      <td class="td-total">${formatCurrency(item.line_total)}</td>
    </tr>`).join('')

  const hasBankDetails = sender?.bank_sort_code && sender?.bank_account_number
  const bankBlock = hasBankDetails ? `
    <div class="payment-col">
      <div class="payment-label">Payment details</div>
      <div class="pay-grid">
        <span class="pay-l">Account name</span>
        <span class="pay-r">${sender.bank_account_name || sender.business_name || sender.full_name || ''}</span>
        <span class="pay-l">Sort code</span>
        <span class="pay-r">${sender.bank_sort_code}</span>
        <span class="pay-l">Account number</span>
        <span class="pay-r">${sender.bank_account_number}</span>
        <span class="pay-l">Reference</span>
        <span class="pay-r ref">${sender.bank_reference_note || invoice.invoice_number}</span>
      </div>
      ${invoice.payment_terms ? `<div class="terms">${invoice.payment_terms}</div>` : ''}
    </div>`
    : `<div class="payment-col">${invoice.payment_terms ? `<div class="terms">${invoice.payment_terms}</div>` : ''}</div>`

  const senderBlock = sender?.logo_url
    ? `<img src="${sender.logo_url}" alt="" class="sender-logo" />`
    : `<div class="sender-name">${sender?.business_name || sender?.full_name || ''}</div>`

  const dueCls = invoice.status === 'overdue' ? 'date-val overdue' : 'date-val'

  const paidDate = invoice.paid_date
    ? `<div class="date-block">
        <div class="date-label">Paid on</div>
        <div class="date-val paid">${new Date(invoice.paid_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
       </div>` : ''

  const stamp = invoice.status === 'paid'
    ? `<div class="status-stamp paid-stamp">Paid</div>`
    : invoice.status === 'overdue'
    ? `<div class="status-stamp overdue-stamp">Overdue</div>`
    : invoice.status === 'draft'
    ? `<div class="status-stamp">Draft</div>` : ''

  const projectRow = project?.title
    ? `<div class="notes" style="font-style:normal;margin-top:20px;color:#64748b;">Project: <span style="color:#334155;font-weight:600;">${project.title}</span></div>`
    : ''
  const notesBlock = invoice.notes
    ? `<div class="notes"${project?.title ? ' style="margin-top:6px;"' : ''}>Notes: ${invoice.notes}</div>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <title>${invoice.invoice_number}</title>
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    html, body { font-family:'Plus Jakarta Sans',sans-serif; font-size:12px; line-height:1.5; color:#111827; background:#fff; -webkit-font-smoothing:antialiased; }

    .page { max-width:720px; margin:0 auto; padding:48px 48px 56px; }

    /* Header */
    .doc-header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:24px; border-bottom:1px solid #f1f5f9; margin-bottom:28px; }
    .sender-name  { font-size:17px; font-weight:800; color:#0f172a; letter-spacing:-0.03em; margin-bottom:4px; }
    .sender-logo  { height:40px; width:auto; object-fit:contain; display:block; margin-bottom:4px; }
    .sender-det   { font-size:11px; color:#94a3b8; line-height:1.7; }
    .doc-type-label { font-size:10px; font-weight:700; color:#64748b; letter-spacing:0.16em; text-transform:uppercase; text-align:right; margin-bottom:6px; }
    .doc-number   { font-size:22px; font-weight:800; color:#0f172a; letter-spacing:-0.03em; text-align:right; }

    /* Meta row */
    .meta-row { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:24px; border-bottom:1px solid #f1f5f9; margin-bottom:24px; }
    .bill-label  { font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.14em; margin-bottom:8px; }
    .client-name { font-size:15px; font-weight:700; color:#0f172a; letter-spacing:-0.01em; margin-bottom:4px; }
    .client-det  { font-size:11.5px; color:#64748b; margin-bottom:2px; }
    .dates-col   { text-align:right; }
    .date-block  { margin-bottom:10px; }
    .date-label  { font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.14em; margin-bottom:3px; }
    .date-val    { font-size:12.5px; font-weight:600; color:#0f172a; }
    .date-val.overdue { color:#dc2626; }
    .date-val.paid    { color:#16a34a; }
    .status-stamp { display:inline-block; font-size:10px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; padding:3px 10px; border:1.5px solid #94a3b8; color:#94a3b8; margin-top:6px; }
    .status-stamp.paid-stamp    { border-color:#16a34a; color:#16a34a; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .status-stamp.overdue-stamp { border-color:#dc2626; color:#dc2626; -webkit-print-color-adjust:exact; print-color-adjust:exact; }

    /* Table */
    table { width:100%; border-collapse:collapse; margin-bottom:20px; }
    thead tr { border-top:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0; }
    th { font-size:9px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.12em; padding:9px 0; text-align:left; }
    th.r { text-align:right; }
    td { padding:12px 0; font-size:12.5px; border-bottom:1px solid #f8fafc; vertical-align:top; }
    td.td-desc  { color:#334155; padding-right:16px; }
    td.td-num   { text-align:right; color:#94a3b8; white-space:nowrap; }
    td.td-vat   { text-align:right; color:#94a3b8; }
    td.td-total { text-align:right; color:#0f172a; font-weight:600; white-space:nowrap; }

    /* Footer row */
    .doc-footer-row { display:flex; justify-content:space-between; align-items:flex-start; gap:32px; margin-top:8px; }
    .payment-col   { flex:1; }
    .payment-label { font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.14em; margin-bottom:10px; }
    .pay-grid { display:grid; grid-template-columns:110px 1fr; row-gap:5px; }
    .pay-l { font-size:11.5px; color:#64748b; }
    .pay-r { font-size:11.5px; font-weight:600; color:#334155; }
    .pay-r.ref { color:#0f172a; font-weight:700; }
    .terms { font-size:11px; color:#94a3b8; margin-top:12px; }

    /* Totals */
    .totals-col { width:220px; flex-shrink:0; }
    .tot-row   { display:flex; justify-content:space-between; padding:5px 0; font-size:12px; border-bottom:1px solid #f1f5f9; }
    .tot-l { color:#475569; }
    .tot-r { color:#475569; font-weight:500; }
    .tot-grand { display:flex; justify-content:space-between; padding:10px 0 0; margin-top:4px; border-top:1.5px solid #0f172a; font-size:15px; font-weight:800; color:#0f172a; }

    .notes { font-size:11px; color:#94a3b8; line-height:1.6; margin-top:20px; font-style:italic; }

    /* Page footer */
    .page-footer { margin-top:36px; padding-top:14px; border-top:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; }
    .page-footer-l { font-size:10px; color:#94a3b8; }
    .page-footer-r { font-size:9px; color:#94a3b8; }
  </style>
</head>
<body>
<div class="page">

  <div class="doc-header">
    <div>
      ${senderBlock}
      ${(sender?.logo_url || sender?.business_name) && sender?.full_name ? `<div class="sender-det">${sender.full_name}</div>` : ''}
      ${sender?.address_line1 ? `<div class="sender-det">${sender.address_line1}</div>` : ''}
      ${sender?.address_line2 ? `<div class="sender-det">${sender.address_line2}</div>` : ''}
      ${sender?.city || sender?.postcode ? `<div class="sender-det">${[sender?.city, sender?.postcode].filter(Boolean).join(', ')}</div>` : ''}
      ${sender?.phone ? `<div class="sender-det">${sender.phone}</div>` : ''}
      ${sender?.email ? `<div class="sender-det">${sender.email}</div>` : ''}
      ${sender?.vat_number ? `<div class="sender-det">VAT No: ${sender.vat_number}</div>` : ''}
      ${sender?.utr_number ? `<div class="sender-det">UTR: ${sender.utr_number}</div>` : ''}
    </div>
    <div>
      <div class="doc-type-label">Invoice</div>
      <div class="doc-number">${invoice.invoice_number}</div>
    </div>
  </div>

  <div class="meta-row">
    <div>
      <div class="bill-label">Bill to</div>
      <div class="client-name">${client?.name ?? ''}</div>
      ${client?.contact_name ? `<div class="client-det">${client.contact_name}</div>` : ''}
      ${client?.email ? `<div class="client-det">${client.email}</div>` : ''}
      ${client?.address_line1 ? `<div class="client-det">${client.address_line1}</div>` : ''}
      ${client?.city ? `<div class="client-det">${client.city}${client.postcode ? `, ${client.postcode}` : ''}</div>` : ''}
    </div>
    <div class="dates-col">
      <div class="date-block">
        <div class="date-label">Issue date</div>
        <div class="date-val">${new Date(invoice.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      </div>
      <div class="date-block">
        <div class="date-label">Due date</div>
        <div class="${dueCls}">${new Date(invoice.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      </div>
      ${paidDate}
      ${stamp}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="r">Qty</th>
        <th class="r">Unit price</th>
        <th class="r">VAT</th>
        <th class="r">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="doc-footer-row">
    ${bankBlock}
    <div class="totals-col">
      <div class="tot-row"><span class="tot-l">Subtotal</span><span class="tot-r">${formatCurrency(invoice.subtotal)}</span></div>
      <div class="tot-row"><span class="tot-l">VAT</span><span class="tot-r">${formatCurrency(invoice.vat_amount)}</span></div>
      <div class="tot-grand"><span>Total due</span><span>${formatCurrency(invoice.total)}</span></div>
    </div>
  </div>

  ${projectRow}
  ${notesBlock}

  <div class="page-footer">
    <span class="page-footer-l">${invoice.invoice_number} · ${sender?.business_name || sender?.full_name || ''}</span>
    <span class="page-footer-r">Powered by freedesk</span>
  </div>

</div>
${withPrintScript ? '<script>window.onload = () => window.print()</script>' : ''}
</body>
</html>`
}

export async function generateInvoicePdfBuffer(invoice: any): Promise<Buffer | null> {
  try {
    const chromium = (await import('@sparticuz/chromium')).default
    const puppeteer = (await import('puppeteer-core')).default
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
    try {
      const page = await browser.newPage()
      const html = buildInvoiceHtml(invoice, false)
      await page.setContent(html, { waitUntil: 'networkidle0' })
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      })
      return Buffer.from(pdf)
    } finally {
      await browser.close()
    }
  } catch (e) {
    console.error('[generateInvoicePdfBuffer] PDF generation failed:', e)
    return null
  }
}

// ── Quote PDF ─────────────────────────────────────────────────────────────

export function buildQuoteHtml(quote: any, sender: any, withPrintScript = false): string {
  const client    = quote.clients as any
  const project   = (quote.projects ?? null) as any
  const lineItems = (quote.quote_line_items ?? []) as any[]
  const expired   = new Date(quote.expiry_date) < new Date()

  const rows = lineItems.map((item: any) => `
    <tr>
      <td class="td-desc">${item.description}</td>
      <td class="td-num">${item.quantity}</td>
      <td class="td-num">${formatCurrency(item.unit_price)}</td>
      <td class="td-vat">${item.vat_rate}%</td>
      <td class="td-total">${formatCurrency(item.line_total)}</td>
    </tr>`).join('')

  const senderBlock = sender?.logo_url
    ? `<img src="${sender.logo_url}" alt="" class="sender-logo" />`
    : `<div class="sender-name">${sender?.business_name || sender?.full_name || ''}</div>`

  const expiryCls = expired ? 'date-val overdue' : 'date-val'

  const stamp = quote.status === 'accepted'
    ? `<div class="status-stamp accepted-stamp">Accepted</div>`
    : expired
    ? `<div class="status-stamp expired-stamp">Expired</div>`
    : quote.status === 'declined'
    ? `<div class="status-stamp declined-stamp">Declined</div>` : ''

  const projectRow = project?.title
    ? `<div class="notes" style="font-style:normal;margin-top:20px;color:#64748b;">Project: <span style="color:#334155;font-weight:600;">${project.title}</span></div>`
    : ''
  const notesBlock = quote.notes
    ? `<div class="notes"${project?.title ? ' style="margin-top:6px;"' : ''}>Notes: ${quote.notes}</div>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <title>${quote.quote_number}</title>
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    html, body { font-family:'Plus Jakarta Sans',sans-serif; font-size:12px; line-height:1.5; color:#111827; background:#fff; -webkit-font-smoothing:antialiased; }
    .page { max-width:720px; margin:0 auto; padding:48px 48px 56px; }
    .doc-header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:24px; border-bottom:1px solid #f1f5f9; margin-bottom:28px; }
    .sender-name  { font-size:17px; font-weight:800; color:#0f172a; letter-spacing:-0.03em; margin-bottom:4px; }
    .sender-logo  { height:40px; width:auto; object-fit:contain; display:block; margin-bottom:4px; }
    .sender-det   { font-size:11px; color:#94a3b8; line-height:1.7; }
    .doc-type-label { font-size:10px; font-weight:700; color:#64748b; letter-spacing:0.16em; text-transform:uppercase; text-align:right; margin-bottom:6px; }
    .doc-number   { font-size:22px; font-weight:800; color:#0f172a; letter-spacing:-0.03em; text-align:right; }
    .meta-row { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:24px; border-bottom:1px solid #f1f5f9; margin-bottom:24px; }
    .bill-label  { font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.14em; margin-bottom:8px; }
    .client-name { font-size:15px; font-weight:700; color:#0f172a; letter-spacing:-0.01em; margin-bottom:4px; }
    .client-det  { font-size:11.5px; color:#64748b; margin-bottom:2px; }
    .dates-col   { text-align:right; }
    .date-block  { margin-bottom:10px; }
    .date-label  { font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.14em; margin-bottom:3px; }
    .date-val    { font-size:12.5px; font-weight:600; color:#0f172a; }
    .date-val.overdue { color:#dc2626; }
    .status-stamp { display:inline-block; font-size:10px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; padding:3px 10px; margin-top:6px; border:1.5px solid #94a3b8; color:#94a3b8; }
    .status-stamp.accepted-stamp { border-color:#16a34a; color:#16a34a; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .status-stamp.expired-stamp  { border-color:#94a3b8; color:#94a3b8; }
    .status-stamp.declined-stamp { border-color:#dc2626; color:#dc2626; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    table { width:100%; border-collapse:collapse; margin-bottom:20px; }
    thead tr { border-top:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0; }
    th { font-size:9px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.12em; padding:9px 0; text-align:left; }
    th.r { text-align:right; }
    td { padding:12px 0; font-size:12.5px; border-bottom:1px solid #f8fafc; vertical-align:top; }
    td.td-desc  { color:#334155; padding-right:16px; }
    td.td-num   { text-align:right; color:#94a3b8; white-space:nowrap; }
    td.td-vat   { text-align:right; color:#94a3b8; }
    td.td-total { text-align:right; color:#0f172a; font-weight:600; white-space:nowrap; }
    .doc-footer-row { display:flex; justify-content:space-between; align-items:flex-start; gap:32px; margin-top:8px; }
    .validity-col  { flex:1; }
    .validity-label { font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.14em; margin-bottom:8px; }
    .validity-text  { font-size:11.5px; color:#64748b; line-height:1.6; }
    .notes { font-size:11px; color:#94a3b8; line-height:1.6; margin-top:10px; font-style:italic; }
    .totals-col { width:220px; flex-shrink:0; }
    .tot-row   { display:flex; justify-content:space-between; padding:5px 0; font-size:12px; border-bottom:1px solid #f1f5f9; }
    .tot-l { color:#475569; }
    .tot-r { color:#475569; font-weight:500; }
    .tot-grand { display:flex; justify-content:space-between; padding:10px 0 0; margin-top:4px; border-top:1.5px solid #0f172a; font-size:15px; font-weight:800; color:#0f172a; }
    .page-footer { margin-top:36px; padding-top:14px; border-top:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; }
    .page-footer-l { font-size:10px; color:#94a3b8; }
    .page-footer-r { font-size:9px; color:#94a3b8; }
  </style>
</head>
<body>
<div class="page">
  <div class="doc-header">
    <div>
      ${senderBlock}
      ${(sender?.logo_url || sender?.business_name) && sender?.full_name ? `<div class="sender-det">${sender.full_name}</div>` : ''}
      ${sender?.address_line1 ? `<div class="sender-det">${sender.address_line1}</div>` : ''}
      ${sender?.address_line2 ? `<div class="sender-det">${sender.address_line2}</div>` : ''}
      ${sender?.city || sender?.postcode ? `<div class="sender-det">${[sender?.city, sender?.postcode].filter(Boolean).join(', ')}</div>` : ''}
      ${sender?.phone ? `<div class="sender-det">${sender.phone}</div>` : ''}
      ${sender?.email ? `<div class="sender-det">${sender.email}</div>` : ''}
      ${sender?.vat_number ? `<div class="sender-det">VAT No: ${sender.vat_number}</div>` : ''}
      ${sender?.utr_number ? `<div class="sender-det">UTR: ${sender.utr_number}</div>` : ''}
    </div>
    <div>
      <div class="doc-type-label">Quote</div>
      <div class="doc-number">${quote.quote_number}</div>
    </div>
  </div>
  <div class="meta-row">
    <div>
      <div class="bill-label">Prepared for</div>
      <div class="client-name">${client?.name ?? ''}</div>
      ${client?.contact_name ? `<div class="client-det">${client.contact_name}</div>` : ''}
      ${client?.email ? `<div class="client-det">${client.email}</div>` : ''}
      ${client?.address_line1 ? `<div class="client-det">${client.address_line1}</div>` : ''}
      ${client?.city ? `<div class="client-det">${client.city}${client.postcode ? `, ${client.postcode}` : ''}</div>` : ''}
    </div>
    <div class="dates-col">
      <div class="date-block">
        <div class="date-label">Issue date</div>
        <div class="date-val">${new Date(quote.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      </div>
      <div class="date-block">
        <div class="date-label">Valid until</div>
        <div class="${expiryCls}">${new Date(quote.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      </div>
      ${stamp}
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="r">Qty</th>
        <th class="r">Unit price</th>
        <th class="r">VAT</th>
        <th class="r">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="doc-footer-row">
    <div class="validity-col">
      <div class="validity-label">Validity</div>
      <div class="validity-text">Valid until ${new Date(quote.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. To accept, please reply to this email or contact us directly.</div>
    </div>
    <div class="totals-col">
      <div class="tot-row"><span class="tot-l">Subtotal</span><span class="tot-r">${formatCurrency(quote.subtotal)}</span></div>
      <div class="tot-row"><span class="tot-l">VAT</span><span class="tot-r">${formatCurrency(quote.vat_amount)}</span></div>
      <div class="tot-grand"><span>Total</span><span>${formatCurrency(quote.total)}</span></div>
    </div>
  </div>
  ${projectRow}
  ${notesBlock}
  <div class="page-footer">
    <span class="page-footer-l">${quote.quote_number} · ${sender?.business_name || sender?.full_name || ''}</span>
    <span class="page-footer-r">Powered by freedesk</span>
  </div>
</div>
${withPrintScript ? '<script>window.onload = () => window.print()</script>' : ''}
</body>
</html>`
}

export async function generateQuotePdfBuffer(quote: any, sender: any): Promise<Buffer | null> {
  try {
    const chromium = (await import('@sparticuz/chromium')).default
    const puppeteer = (await import('puppeteer-core')).default
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
    try {
      const page = await browser.newPage()
      const html = buildQuoteHtml(quote, sender, false)
      await page.setContent(html, { waitUntil: 'networkidle0' })
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      })
      return Buffer.from(pdf)
    } finally {
      await browser.close()
    }
  } catch (e) {
    console.error('[generateQuotePdfBuffer] PDF generation failed:', e)
    return null
  }
}
