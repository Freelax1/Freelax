import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTaxYear } from '@/lib/tax-calculations'
import { DISCLAIMER_FOOTER_TEXT } from '@/components/not-tax-advice'
import JSZip from 'jszip'
import ExcelJS from 'exceljs'

// ── Styling constants ─────────────────────────────────────────────────
const BRAND_GREEN     = 'FF1D6B35'
const BRAND_GREEN_SOFT = 'FFEAFAF0'
const HEADER_BG       = 'FF0F172A'   // slate-900
const HEADER_FG       = 'FFFFFFFF'
const SECTION_BG      = 'FFF5F4EE'   // cream
const TOTALS_BG       = 'FFF1F5F9'   // slate-100
const MUTED_FG        = 'FF64748B'   // slate-500

const CURRENCY_FMT = '£#,##0.00;[Red]-£#,##0.00'
const DATE_FMT     = 'dd mmm yyyy'
const INT_FMT      = '#,##0'

function applyHeaderStyle(row: ExcelJS.Row) {
  row.height = 20
  row.eachCell(cell => {
    cell.font      = { bold: true, color: { argb: HEADER_FG }, size: 11, name: 'Calibri' }
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
    cell.border    = {
      top:    { style: 'thin', color: { argb: HEADER_BG } },
      bottom: { style: 'thin', color: { argb: HEADER_BG } },
    }
  })
}

function applyTotalsStyle(row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.font   = { bold: true, color: { argb: 'FF0F172A' }, size: 11 }
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTALS_BG } }
    cell.border = {
      top:    { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'thin',   color: { argb: 'FF0F172A' } },
    }
  })
}

function stripeRows(sheet: ExcelJS.Worksheet, firstDataRow: number, lastDataRow: number) {
  for (let r = firstDataRow; r <= lastDataRow; r++) {
    if ((r - firstDataRow) % 2 === 1) {
      sheet.getRow(r).eachCell(cell => {
        if (!cell.fill || (cell.fill as any).type !== 'pattern' || !(cell.fill as any).fgColor) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } }
        }
      })
    }
  }
}

// ── Main handler ──────────────────────────────────────────────────────
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { start, end, label } = getCurrentTaxYear()

  const [
    { data: invoices },
    { data: expenses },
    { data: profile },
  ] = await Promise.all([
    supabase.from('invoices')
      .select('invoice_number, issue_date, paid_date, total, vat_amount, clients(name)')
      .eq('user_id', user.id)
      .eq('status', 'paid')
      .gte('paid_date', start.toISOString())
      .lte('paid_date', end.toISOString())
      .order('paid_date', { ascending: true }),
    supabase.from('expenses')
      .select('date, merchant, category, amount, vat_amount, vat_reclaimable, receipt_url, description')
      .eq('user_id', user.id)
      .gte('date', start.toISOString().slice(0, 10))
      .lte('date', end.toISOString().slice(0, 10))
      .order('date', { ascending: true }),
    supabase.from('users')
      .select('full_name, business_name, business_type, vat_registered, utr, vat_number')
      .eq('id', user.id)
      .single(),
  ])

  const inv = invoices ?? []
  const exp = expenses ?? []

  const totalIncome     = inv.reduce((s, i) => s + (Number(i.total) - Number(i.vat_amount ?? 0)), 0)
  const totalVatColl    = inv.reduce((s, i) => s + Number(i.vat_amount ?? 0), 0)
  const totalExpenses   = exp.reduce((s, e) => s + Number(e.amount), 0)
  const totalVatReclaim = exp.filter(e => e.vat_reclaimable).reduce((s, e) => s + Number(e.vat_amount ?? 0), 0)
  const netProfit       = totalIncome - totalExpenses
  const netVatOwed      = totalVatColl - totalVatReclaim

  // Build workbook
  const wb = new ExcelJS.Workbook()
  wb.creator  = 'Freelax'
  wb.lastModifiedBy = 'Freelax'
  wb.created  = new Date()
  wb.modified = new Date()
  wb.properties.date1904 = false

  // ─────────────────────────────────────────────────────────────────
  // Sheet 1: Summary
  // ─────────────────────────────────────────────────────────────────
  const summary = wb.addWorksheet('Summary', {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
  })
  summary.columns = [
    { width: 3 },
    { width: 32 },
    { width: 20 },
    { width: 20 },
  ]

  // Title bar
  summary.mergeCells('B2:D2')
  const titleCell = summary.getCell('B2')
  titleCell.value = 'Self Assessment Pack'
  titleCell.font = { name: 'Calibri', size: 22, bold: true, color: { argb: 'FF0F172A' } }
  summary.getRow(2).height = 30

  summary.mergeCells('B3:D3')
  const subtitleCell = summary.getCell('B3')
  subtitleCell.value = `Tax year ${label}  ·  Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
  subtitleCell.font = { name: 'Calibri', size: 11, color: { argb: MUTED_FG } }

  // Accent bar
  summary.mergeCells('B5:D5')
  const accent = summary.getCell('B5')
  accent.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_GREEN } }
  summary.getRow(5).height = 3

  let row = 7

  function writeSection(title: string) {
    summary.mergeCells(`B${row}:D${row}`)
    const c = summary.getCell(`B${row}`)
    c.value = title
    c.font  = { name: 'Calibri', size: 10, bold: true, color: { argb: MUTED_FG } }
    c.alignment = { vertical: 'middle' }
    summary.getRow(row).height = 20
    row++
  }

  function writeKV(label: string, value: string | number, opts?: { currency?: boolean; bold?: boolean; hl?: boolean }) {
    const lc = summary.getCell(`B${row}`)
    const vc = summary.getCell(`C${row}`)
    summary.mergeCells(`C${row}:D${row}`)
    lc.value = label
    lc.font  = { name: 'Calibri', size: 11, color: { argb: opts?.bold ? 'FF0F172A' : MUTED_FG }, bold: !!opts?.bold }
    vc.value = value
    vc.font  = { name: 'Calibri', size: 11, bold: !!opts?.bold, color: { argb: 'FF0F172A' } }
    vc.alignment = { horizontal: 'right' }
    if (opts?.currency) vc.numFmt = CURRENCY_FMT
    if (opts?.hl) {
      lc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_GREEN_SOFT } }
      vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_GREEN_SOFT } }
    }
    // Subtle bottom border
    lc.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } }
    vc.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } }
    row++
  }

  function blank() { row++ }

  // Business info
  if (profile?.business_name || profile?.full_name) {
    writeSection('BUSINESS')
    writeKV('Name',          profile?.full_name ?? '—')
    if (profile?.business_name)  writeKV('Business',      profile.business_name)
    if (profile?.business_type)  writeKV('Type',          String(profile.business_type).replace(/_/g, ' '))
    if (profile?.utr)            writeKV('UTR',           profile.utr)
    if (profile?.vat_registered) writeKV('VAT number',    profile.vat_number ?? 'Registered')
    blank()
  }

  writeSection('INCOME')
  writeKV('Invoices paid',        inv.length)
  writeKV('Gross income (ex-VAT)', totalIncome, { currency: true })
  if (profile?.vat_registered) writeKV('VAT collected', totalVatColl, { currency: true })
  blank()

  writeSection('EXPENSES')
  writeKV('Expense entries',      exp.length)
  writeKV('Total amount',          totalExpenses, { currency: true })
  if (profile?.vat_registered) writeKV('VAT reclaimable', totalVatReclaim, { currency: true })
  blank()

  writeSection('PROFIT & LOSS')
  writeKV('Gross income',       totalIncome, { currency: true })
  writeKV('Allowable expenses', -totalExpenses, { currency: true })
  writeKV('Net profit',          netProfit,   { currency: true, bold: true, hl: true })
  blank()

  if (profile?.vat_registered) {
    writeSection('VAT POSITION')
    writeKV('VAT collected',    totalVatColl,  { currency: true })
    writeKV('VAT reclaimable', -totalVatReclaim, { currency: true })
    writeKV('Net VAT owed',     netVatOwed,    { currency: true, bold: true, hl: true })
    blank()
  }

  // Disclaimer footer
  summary.mergeCells(`B${row}:D${row + 1}`)
  const foot = summary.getCell(`B${row}`)
  foot.value = DISCLAIMER_FOOTER_TEXT
  foot.font  = { name: 'Calibri', size: 9, italic: true, color: { argb: MUTED_FG } }
  foot.alignment = { vertical: 'top', wrapText: true }
  summary.getRow(row).height = 24

  // ─────────────────────────────────────────────────────────────────
  // Sheet 2: Invoices
  // ─────────────────────────────────────────────────────────────────
  const invSheet = wb.addWorksheet('Invoices', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: false }],
  })
  invSheet.columns = [
    { header: 'Invoice #',  key: 'num',    width: 16 },
    { header: 'Client',     key: 'client', width: 28 },
    { header: 'Issue date', key: 'issue',  width: 14, style: { numFmt: DATE_FMT } },
    { header: 'Paid date',  key: 'paid',   width: 14, style: { numFmt: DATE_FMT } },
    { header: 'Ex-VAT',     key: 'exVat',  width: 14, style: { numFmt: CURRENCY_FMT } },
    { header: 'VAT',        key: 'vat',    width: 14, style: { numFmt: CURRENCY_FMT } },
    { header: 'Total',      key: 'total',  width: 14, style: { numFmt: CURRENCY_FMT } },
  ]
  applyHeaderStyle(invSheet.getRow(1))

  inv.forEach(i => {
    invSheet.addRow({
      num:    i.invoice_number,
      client: (i as any).clients?.name ?? '—',
      issue:  i.issue_date ? new Date(i.issue_date) : null,
      paid:   i.paid_date  ? new Date(i.paid_date)  : null,
      exVat:  Number(i.total) - Number(i.vat_amount ?? 0),
      vat:    Number(i.vat_amount ?? 0),
      total:  Number(i.total),
    })
  })

  // Totals row
  const invLastDataRow = invSheet.rowCount
  if (inv.length > 0) {
    const totalsRow = invSheet.addRow({
      num:    'TOTAL',
      client: `${inv.length} invoice${inv.length === 1 ? '' : 's'}`,
      exVat:  { formula: `SUM(E2:E${invLastDataRow})` } as any,
      vat:    { formula: `SUM(F2:F${invLastDataRow})` } as any,
      total:  { formula: `SUM(G2:G${invLastDataRow})` } as any,
    })
    applyTotalsStyle(totalsRow)
    totalsRow.getCell('exVat').numFmt = CURRENCY_FMT
    totalsRow.getCell('vat').numFmt   = CURRENCY_FMT
    totalsRow.getCell('total').numFmt = CURRENCY_FMT
  }
  stripeRows(invSheet, 2, invLastDataRow)
  invSheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 7 } }

  // ─────────────────────────────────────────────────────────────────
  // Sheet 3: Expenses
  // ─────────────────────────────────────────────────────────────────
  const expSheet = wb.addWorksheet('Expenses', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: false }],
  })
  expSheet.columns = [
    { header: 'Date',            key: 'date',     width: 14, style: { numFmt: DATE_FMT } },
    { header: 'Merchant',        key: 'merchant', width: 26 },
    { header: 'Category',        key: 'category', width: 22 },
    { header: 'Amount',          key: 'amount',   width: 14, style: { numFmt: CURRENCY_FMT } },
    { header: 'VAT',             key: 'vat',      width: 12, style: { numFmt: CURRENCY_FMT } },
    { header: 'VAT reclaimable', key: 'recl',     width: 16, style: { alignment: { horizontal: 'center' } } },
    { header: 'Receipt',         key: 'receipt',  width: 36 },
    { header: 'Notes',           key: 'notes',    width: 36 },
  ]
  applyHeaderStyle(expSheet.getRow(1))

  exp.forEach(e => {
    const row = expSheet.addRow({
      date:     e.date ? new Date(e.date) : null,
      merchant: e.merchant ?? '',
      category: String(e.category ?? '').replace(/_/g, ' '),
      amount:   Number(e.amount ?? 0),
      vat:      Number(e.vat_amount ?? 0),
      recl:     e.vat_reclaimable ? 'Yes' : 'No',
      receipt:  e.receipt_url ?? '',
      notes:    (e as any).description ?? '',
    })
    // Hyperlink receipts
    if (e.receipt_url) {
      const c = row.getCell('receipt')
      c.value = { text: 'View receipt', hyperlink: e.receipt_url, tooltip: e.receipt_url } as any
      c.font  = { color: { argb: 'FF1D6B35' }, underline: true }
    }
  })

  const expLastDataRow = expSheet.rowCount
  if (exp.length > 0) {
    const totalsRow = expSheet.addRow({
      date:     null,
      merchant: 'TOTAL',
      category: `${exp.length} expense${exp.length === 1 ? '' : 's'}`,
      amount:   { formula: `SUM(D2:D${expLastDataRow})` } as any,
      vat:      { formula: `SUM(E2:E${expLastDataRow})` } as any,
    })
    applyTotalsStyle(totalsRow)
    totalsRow.getCell('amount').numFmt = CURRENCY_FMT
    totalsRow.getCell('vat').numFmt    = CURRENCY_FMT
  }
  stripeRows(expSheet, 2, expLastDataRow)
  expSheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 8 } }

  // ─────────────────────────────────────────────────────────────────
  // Sheet 4: Category breakdown
  // ─────────────────────────────────────────────────────────────────
  if (exp.length > 0) {
    const catSheet = wb.addWorksheet('By Category', {
      views: [{ state: 'frozen', ySplit: 1, showGridLines: false }],
    })
    catSheet.columns = [
      { header: 'Category',    key: 'cat',    width: 26 },
      { header: 'Entries',     key: 'count',  width: 12, style: { numFmt: INT_FMT } },
      { header: 'Total',       key: 'total',  width: 16, style: { numFmt: CURRENCY_FMT } },
      { header: '% of total',  key: 'pct',    width: 14, style: { numFmt: '0.0%' } },
    ]
    applyHeaderStyle(catSheet.getRow(1))

    const catTotals: Record<string, { total: number; count: number }> = {}
    exp.forEach(e => {
      const k = String(e.category ?? 'uncategorised')
      if (!catTotals[k]) catTotals[k] = { total: 0, count: 0 }
      catTotals[k].total += Number(e.amount ?? 0)
      catTotals[k].count += 1
    })

    const sorted = Object.entries(catTotals).sort((a, b) => b[1].total - a[1].total)
    sorted.forEach(([cat, v]) => {
      catSheet.addRow({
        cat:   cat.replace(/_/g, ' '),
        count: v.count,
        total: v.total,
        pct:   totalExpenses > 0 ? v.total / totalExpenses : 0,
      })
    })

    const catLast = catSheet.rowCount
    const catTotalsRow = catSheet.addRow({
      cat:   'TOTAL',
      count: { formula: `SUM(B2:B${catLast})` } as any,
      total: { formula: `SUM(C2:C${catLast})` } as any,
      pct:   1,
    })
    applyTotalsStyle(catTotalsRow)
    catTotalsRow.getCell('total').numFmt = CURRENCY_FMT
    catTotalsRow.getCell('count').numFmt = INT_FMT
    catTotalsRow.getCell('pct').numFmt   = '0.0%'
    stripeRows(catSheet, 2, catLast)
    catSheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 4 } }
  }

  // ─────────────────────────────────────────────────────────────────
  // Write workbook & bundle with receipts in a ZIP
  // ─────────────────────────────────────────────────────────────────
  const xlsxBuffer = await wb.xlsx.writeBuffer()
  const xlsxName   = `SA-pack-${label.split('/').join('-')}.xlsx`

  const zip = new JSZip()
  zip.file(xlsxName, xlsxBuffer as any)

  // Receipts folder
  const RECEIPT_TIMEOUT_MS = 8_000
  const RECEIPT_MAX_BYTES  = 10 * 1024 * 1024  // 10 MB per file

  async function fetchReceiptSafe(url: string): Promise<ArrayBuffer | null> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(RECEIPT_TIMEOUT_MS) })
      if (!res.ok || !res.body) return null
      const reader = res.body.getReader()
      const chunks: Uint8Array[] = []
      let total = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        total += value.byteLength
        if (total > RECEIPT_MAX_BYTES) { await reader.cancel(); return null }
        chunks.push(value)
      }
      const out = new Uint8Array(total)
      let offset = 0
      for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength }
      return out.buffer
    } catch {
      return null  // timeout, network error, or size exceeded — skip gracefully
    }
  }

  const receiptsFolder = zip.folder('receipts')!
  const receiptExps = exp.filter(e => e.receipt_url)
  await Promise.all(receiptExps.map(async (e, idx) => {
    const buf = await fetchReceiptSafe(e.receipt_url)
    if (!buf) return
    const ext = e.receipt_url.split('.').pop()?.split('?')[0] ?? 'jpg'
    const filename = `${e.date}_${(e.merchant ?? 'receipt').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${idx + 1}.${ext}`
    receiptsFolder.file(filename, buf)
  }))

  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })
  const zipName   = `sa-pack-${label.split('/').join('-')}.zip`

  return new NextResponse(zipBuffer, {
    status: 200,
    headers: {
      'Content-Type':        'application/zip',
      'Content-Disposition': `attachment; filename="${zipName}"`,
      'Cache-Control':       'no-store',
    },
  })
}
