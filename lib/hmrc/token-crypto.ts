// lib/hmrc/token-crypto.ts
// AES-256-GCM encryption for HMRC OAuth tokens stored in oauth_connections.
//
// Tokens are sensitive credentials — storing them plaintext in the DB is a
// security risk and a blocker for HMRC's production application review.
//
// Key setup:
//   Generate a 32-byte key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//   Add to Vercel env vars as: HMRC_TOKEN_ENCRYPTION_KEY=<64-char hex string>
//
// Storage format: base64(iv):base64(authTag):base64(ciphertext)
// The IV is random per encryption — identical tokens produce different ciphertexts.

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { refreshAccessToken } from './client'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES   = 12  // 96-bit IV — recommended for GCM
const TAG_BYTES  = 16  // 128-bit auth tag — GCM default

/** Refresh proactively if the access token expires within this window. */
const EXPIRY_REFRESH_BUFFER_MS = 60_000

function getEncryptionKey(): Buffer {
  const hex = process.env.HMRC_TOKEN_ENCRYPTION_KEY
  if (!hex) {
    throw new Error(
      'HMRC_TOKEN_ENCRYPTION_KEY is not set. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }
  const key = Buffer.from(hex, 'hex')
  if (key.length !== 32) {
    throw new Error('HMRC_TOKEN_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)')
  }
  return key
}

/**
 * Encrypts a plaintext token string.
 * Returns a single string in the format: base64(iv):base64(authTag):base64(ciphertext)
 */
export function encryptToken(plaintext: string): string {
  const key       = getEncryptionKey()
  const iv        = randomBytes(IV_BYTES)
  const cipher    = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()
  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

/**
 * Decrypts a token string previously encrypted by encryptToken().
 * Throws if the ciphertext has been tampered with (GCM auth tag mismatch).
 */
export function decryptToken(ciphertext: string): string {
  const key    = getEncryptionKey()
  const parts  = ciphertext.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format — expected iv:authTag:ciphertext')
  }
  const [ivB64, authTagB64, dataB64] = parts
  const iv      = Buffer.from(ivB64,      'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const data    = Buffer.from(dataB64,    'base64')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  return (
    decipher.update(data).toString('utf8') +
    decipher.final('utf8')
  )
}

export type DecryptedHmrcTokens = {
  accessToken:  string
  refreshToken: string
  tokenExpiry:  string | null
  connectionId: string
}

/**
 * Reads HMRC tokens for a user from oauth_connections and decrypts them.
 * If the token is within 60 seconds of expiry, refreshes it atomically and
 * returns the new pair. Returns null if no connection exists or decryption
 * fails (caller should surface "reconnect HMRC" to the user).
 */
export async function getDecryptedHmrcTokens(userId: string): Promise<DecryptedHmrcTokens | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('oauth_connections')
    .select('id, access_token, refresh_token, token_expiry')
    .eq('user_id', userId)
    .eq('provider', 'hmrc')
    .maybeSingle()

  if (error || !data) return null

  let accessToken: string
  let refreshToken: string
  try {
    accessToken  = decryptToken(data.access_token)
    refreshToken = decryptToken(data.refresh_token)
  } catch (e) {
    console.error('Failed to decrypt HMRC tokens:', e instanceof Error ? e.message : 'decrypt_failed')
    return null
  }

  // Proactive refresh: if expiring soon, rotate now so the next HMRC call sees a fresh token.
  if (data.token_expiry) {
    const expiresAt = new Date(data.token_expiry).getTime()
    if (Number.isFinite(expiresAt) && expiresAt - Date.now() <= EXPIRY_REFRESH_BUFFER_MS) {
      try {
        const fresh = await refreshAndPersistHmrcTokens(
          userId,
          refreshToken,
          data.id,
          data.refresh_token as string,
        )
        return {
          connectionId: data.id,
          accessToken:  fresh.accessToken,
          refreshToken: fresh.refreshToken,
          tokenExpiry:  fresh.tokenExpiry,
        }
      } catch (e) {
        // Refresh failed — fall through with the (likely expired) decrypted token.
        // The caller's HMRC call will 401, and hmrcGet/hmrcPost can attempt one more refresh via its own callback.
        console.error('HMRC token proactive refresh failed:', e instanceof Error ? e.message : 'refresh_failed')
      }
    }
  }

  return {
    connectionId: data.id,
    accessToken,
    refreshToken,
    tokenExpiry: data.token_expiry,
  }
}

/**
 * Refresh the HMRC access token and persist the rotated pair atomically.
 *
 * HMRC refresh tokens are single-use. Two concurrent refreshes would both call
 * HMRC, both succeed (HMRC issues different new pairs), and one persistence
 * would overwrite the other — locking the user out.
 *
 * We guard with optimistic concurrency: the UPDATE only fires if the row's
 * refresh_token still equals the encrypted ciphertext we read at the start of
 * this call. If another request rotated in the meantime, the UPDATE matches 0
 * rows and we throw — the caller should retry (which will pick up the
 * already-rotated tokens via getDecryptedHmrcTokens).
 *
 * @param userId                       — user owning the connection (for logging only)
 * @param oldRefreshTokenPlaintext     — the plaintext refresh token the caller currently holds
 * @param connectionId                 — oauth_connections.id
 * @param oldRefreshTokenCiphertext    — optional: the encrypted refresh_token as it appears in the DB. If omitted, we re-read.
 */
export async function refreshAndPersistHmrcTokens(
  userId: string,
  oldRefreshTokenPlaintext: string,
  connectionId: string,
  oldRefreshTokenCiphertext?: string,
): Promise<{
  accessToken:  string
  refreshToken: string
  tokenExpiry:  string
}> {
  const supabase = await createClient()

  let oldCipher = oldRefreshTokenCiphertext
  if (!oldCipher) {
    const { data: row, error: readErr } = await supabase
      .from('oauth_connections')
      .select('refresh_token')
      .eq('id', connectionId)
      .maybeSingle()
    if (readErr || !row) {
      throw new Error('HMRC connection not found for refresh')
    }
    oldCipher = row.refresh_token as string
  }

  // Verify the plaintext the caller holds still matches what's in the DB.
  let storedPlaintext: string
  try {
    storedPlaintext = decryptToken(oldCipher)
  } catch {
    throw new Error('Stored HMRC refresh token could not be decrypted')
  }
  if (storedPlaintext !== oldRefreshTokenPlaintext) {
    throw new Error('HMRC refresh token already rotated by a concurrent request')
  }

  // Rotate at HMRC.
  const fresh = await refreshAccessToken(oldRefreshTokenPlaintext)

  const newAccessEncrypted  = encryptToken(fresh.access_token)
  const newRefreshEncrypted = encryptToken(fresh.refresh_token)
  const newExpiry           = new Date(Date.now() + fresh.expires_in * 1000).toISOString()

  // Atomically persist: only update if the stored refresh_token ciphertext is
  // still what we read above. If a concurrent refresh has rotated, this matches
  // 0 rows and we throw.
  const { data: updated, error: updateErr } = await supabase
    .from('oauth_connections')
    .update({
      access_token:  newAccessEncrypted,
      refresh_token: newRefreshEncrypted,
      token_expiry:  newExpiry,
    })
    .eq('id', connectionId)
    .eq('refresh_token', oldCipher)
    .select('id')

  if (updateErr) {
    console.error('HMRC token rotation persist failed for', userId, ':', updateErr.message)
    throw new Error('Could not persist refreshed HMRC tokens')
  }
  if (!updated || updated.length === 0) {
    throw new Error('HMRC refresh token already rotated — please retry')
  }

  return {
    accessToken:  fresh.access_token,
    refreshToken: fresh.refresh_token,
    tokenExpiry:  newExpiry,
  }
}

/**
 * Build a refresh callback suitable for passing to hmrcGet/hmrcPost.
 * Returns a closure that rotates the underlying tokens (mutating the local
 * `tokens` reference so subsequent calls in the same request use the latest
 * values) and yields the new access token.
 */
export function buildHmrcRefreshCallback(
  userId: string,
  tokens: { refreshToken: string; accessToken: string; connectionId: string },
): () => Promise<string> {
  return async () => {
    const fresh = await refreshAndPersistHmrcTokens(userId, tokens.refreshToken, tokens.connectionId)
    tokens.accessToken  = fresh.accessToken
    tokens.refreshToken = fresh.refreshToken
    return fresh.accessToken
  }
}
