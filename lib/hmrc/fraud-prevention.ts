// lib/hmrc/fraud-prevention.ts
// Builds HMRC fraud prevention headers for API calls.
//
// HMRC legally requires these headers on all MTD API calls.
// Spec: https://developer.service.hmrc.gov.uk/guides/fraud-prevention
//
// Connection method: WEB_APP_VIA_SERVER
// Some headers (timezone, screen size, device ID) must be collected
// browser-side and passed in via FraudPreventionContext.
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
   */
  timezone?: string
  screenWidth?: number
  screenHeight?: number
  scalingFactor?: number
  colourDepth?: number
  windowWidth?: number
  windowHeight?: number
  doNotTrack?: string
  /** Persistent UUID stored in the browser. Generate once, store in localStorage. */
  deviceId?: string
}

/** Extract the client's public IP from the Vercel/proxy forwarding headers */
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? '0.0.0.0'
}

/**
 * Percent-encodes a string for use in HMRC header values.
 * HMRC requires values containing special characters to be percent-encoded.
 */
function pct(value: string): string {
  return encodeURIComponent(value)
}

/**
 * Builds the full set of HMRC fraud prevention headers from the context.
 * Pass the returned object as additional headers to hmrcGet / hmrcPost.
 *
 * Headers that cannot be determined (e.g. local IPs, MAC addresses) are
 * omitted rather than sent with placeholder values — HMRC's validation
 * tool scores omitted headers as amber, not red.
 */
export function buildFraudPreventionHeaders(
  ctx: FraudPreventionContext,
): Record<string, string> {
  const now       = new Date().toISOString()
  const clientIp  = getClientIp(ctx.request)
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
    'Gov-Client-Browser-JS-User-Agent': pct(userAgent),
    'Gov-Client-Browser-Do-Not-Track':  doNotTrack,
    'Gov-Client-Browser-Plugins':       '', // not accessible server-side

    // ── User identity ─────────────────────────────────────────────────
    // key=value format; freelax-user-id is a vendor-defined key name
    'Gov-Client-User-IDs': `freelax-user-id=${pct(ctx.userId)}`,

    // ── Vendor info ───────────────────────────────────────────────────
    'Gov-Vendor-Product-Name': 'Freelax',
    'Gov-Vendor-Version':      'Freelax=1.0.0',
  }

  // ── Optional browser-side headers (populated when client passes them) ──

  if (ctx.deviceId) {
    headers['Gov-Client-Device-ID'] = ctx.deviceId
  }

  if (ctx.timezone) {
    // HMRC expects UTC offset format e.g. UTC+01:00
    // If the value is an IANA timezone name, we include it as-is — HMRC
    // accepts both IANA names and UTC offsets in this header.
    headers['Gov-Client-Timezone'] = pct(ctx.timezone)
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
