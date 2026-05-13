// lib/hmrc/fraud-prevention.ts
// Builds HMRC fraud prevention headers for API calls.
//
// HMRC legally requires these headers on all MTD API calls.
// Spec: https://developer.service.hmrc.gov.uk/guides/fraud-prevention
//
// Connection method: WEB_APP_VIA_SERVER
// Some headers (timezone, screen size, device ID, public port) must be
// collected browser-side and passed in via FraudPreventionContext.
// Headers that can be derived server-side are built automatically
// from the incoming NextRequest.

import { NextRequest } from 'next/server'

export interface FraudPreventionContext {
  /** The incoming NextRequest from the Freelax API route */
  request: NextRequest
  /** Freelax user ID */
  userId: string
  /**
   * Browser-side values — collect these in the client and pass in the
   * request body when calling a Freelax API route that calls HMRC.
   *
   * Example client-side collection:
   *   timezone:    Intl.DateTimeFormat().resolvedOptions().timeZone
   *   screenWidth: screen.width
   *   screenHeight: screen.height
   *   windowWidth: window.innerWidth
   *   windowHeight: window.innerHeight
   *   doNotTrack:  navigator.doNotTrack ?? 'not-set'
   *   deviceId:    localStorage.getItem('freelax_device_id') ?? generateAndStoreUUID()
   *   publicPort:  (not available in browsers — omit)
   */
  /** IANA timezone name (e.g. "Europe/London") or UTC offset (e.g. "UTC+01:00") */
  timezone?: string
  screenWidth?: number
  screenHeight?: number
  scalingFactor?: number
  colourDepth?: number
  windowWidth?: number
  windowHeight?: number
  doNotTrack?: string
  /** Persistent UUID stored in the browser. Generate once, store in localStorage. Must be a bare UUID. */
  deviceId?: string
  /** The originating device's public TCP port. Browsers do not expose this — omit if unavailable. */
  publicPort?: number
}

/** Extract the client's public IP from the Vercel/proxy forwarding headers */
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? '0.0.0.0'
}

/**
 * Converts an IANA timezone name or UTC offset string to HMRC's required
 * UTC±hh:mm format (e.g. "Europe/London" → "UTC+01:00" in BST).
 */
function toHmrcTimezone(tz: string): string {
  if (/^UTC[+-]\d{2}:\d{2}$/.test(tz)) return tz
  if (tz === 'UTC') return 'UTC+00:00'
  try {
    const fmt = new Intl.DateTimeFormat('en', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    })
    const tzName = fmt.formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value ?? 'GMT'
    // tzName is like "GMT", "GMT+1", "GMT-5", "GMT+5:30"
    const m = tzName.match(/GMT([+-])(\d+)(?::(\d+))?/)
    if (!m) return 'UTC+00:00'
    return `UTC${m[1]}${m[2].padStart(2, '0')}:${(m[3] ?? '0').padStart(2, '0')}`
  } catch {
    return 'UTC+00:00'
  }
}

/**
 * Percent-encodes a string for use in HMRC header values that require it.
 * NOTE: Not all headers use percent-encoding — apply only where the spec requires it.
 */
function pct(value: string): string {
  return encodeURIComponent(value)
}

/**
 * Builds the full set of HMRC fraud prevention headers from the context.
 * Pass the returned object as additional headers to hmrcGet / hmrcPost.
 */
export function buildFraudPreventionHeaders(
  ctx: FraudPreventionContext,
): Record<string, string> {
  const now       = new Date().toISOString()
  const clientIp  = getClientIp(ctx.request)
  // Raw browser UA — must NOT be percent-encoded per HMRC spec
  const userAgent = ctx.request.headers.get('user-agent') ?? ''
  const dnt       = ctx.doNotTrack
    ?? ctx.request.headers.get('dnt')
    ?? 'not-set'

  const doNotTrack =
    dnt === '1' ? 'true' :
    dnt === '0' ? 'false' :
    'not-set'

  const headers: Record<string, string> = {
    // ── Connection method ──────────────────────────────────────────────
    'Gov-Client-Connection-Method': 'WEB_APP_VIA_SERVER',

    // ── Client IP ─────────────────────────────────────────────────────
    'Gov-Client-Public-IP':           clientIp,
    'Gov-Client-Public-IP-Timestamp': now,

    // ── Browser identity ──────────────────────────────────────────────
    // Raw string, NOT percent-encoded (HMRC spec v3.3 requirement)
    'Gov-Client-Browser-JS-User-Agent': userAgent,
    'Gov-Client-Browser-Do-Not-Track':  doNotTrack,
    'Gov-Client-Browser-Plugins':       '',

    // ── User identity ─────────────────────────────────────────────────
    'Gov-Client-User-IDs': `freelax-user-id=${pct(ctx.userId)}`,

    // ── Vendor info ───────────────────────────────────────────────────
    'Gov-Vendor-Product-Name': 'Freelax',
    'Gov-Vendor-Version':      'Freelax=1.0.0',
  }

  // ── Optional browser-side headers ─────────────────────────────────────────

  if (ctx.deviceId) {
    headers['Gov-Client-Device-ID'] = ctx.deviceId
  }

  if (ctx.timezone) {
    // HMRC requires UTC±hh:mm format — convert IANA names automatically
    headers['Gov-Client-Timezone'] = toHmrcTimezone(ctx.timezone)
  }

  if (ctx.publicPort) {
    headers['Gov-Client-Public-Port'] = String(ctx.publicPort)
  }

  if (ctx.screenWidth && ctx.screenHeight) {
    const scaling = ctx.scalingFactor ?? 1
    const depth   = ctx.colourDepth   ?? 24
    headers['Gov-Client-Screens'] =
      `width=${ctx.screenWidth}&height=${ctx.screenHeight}&scaling-factor=${scaling}&colour-depth=${depth}`
  }

  if (ctx.windowWidth && ctx.windowHeight) {
    headers['Gov-Client-Window-Size'] =
      `width=${ctx.windowWidth}&height=${ctx.windowHeight}`
  }

  // ── Vendor network headers (server-side, from env vars) ───────────────────

  const vendorIp = process.env.HMRC_VENDOR_IP
  if (vendorIp) {
    headers['Gov-Vendor-Public-IP']  = vendorIp
    headers['Gov-Vendor-Forwarded']  = `by=${vendorIp};for=${clientIp}`
  }

  const licenseId = process.env.HMRC_VENDOR_LICENSE_ID
  if (licenseId) {
    headers['Gov-Vendor-License-IDs'] = licenseId
  }

  return headers
}

/**
 * Parses browser-side fraud prevention context from a request body.
 * Call this in Freelax API routes that trigger HMRC API calls.
 *
 * The client should include a `_fp` object in the request body:
 * {
 *   _fp: {
 *     timezone:    Intl.DateTimeFormat().resolvedOptions().timeZone,
 *     screenWidth: screen.width,
 *     screenHeight: screen.height,
 *     windowWidth: window.innerWidth,
 *     windowHeight: window.innerHeight,
 *     doNotTrack:  navigator.doNotTrack,
 *     deviceId:    localStorage.getItem('freelax_device_id'),
 *   }
 * }
 */
export function extractFpFromBody(body: any): Partial<FraudPreventionContext> {
  const fp = body?._fp
  if (!fp || typeof fp !== 'object') return {}
  return {
    timezone:      typeof fp.timezone     === 'string' ? fp.timezone     : undefined,
    screenWidth:   typeof fp.screenWidth  === 'number' ? fp.screenWidth  : undefined,
    screenHeight:  typeof fp.screenHeight === 'number' ? fp.screenHeight : undefined,
    windowWidth:   typeof fp.windowWidth  === 'number' ? fp.windowWidth  : undefined,
    windowHeight:  typeof fp.windowHeight === 'number' ? fp.windowHeight : undefined,
    doNotTrack:    typeof fp.doNotTrack   === 'string' ? fp.doNotTrack   : undefined,
    deviceId:      typeof fp.deviceId     === 'string' ? fp.deviceId     : undefined,
  }
}
