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

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES   = 12  // 96-bit IV — recommended for GCM
const TAG_BYTES  = 16  // 128-bit auth tag — GCM default

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

/**
 * Reads HMRC tokens for a user from oauth_connections and decrypts them.
 * Returns null if no connection exists.
 *
 * Use this in all routes that need to call the HMRC API:
 *   const tokens = await getDecryptedHmrcTokens(userId)
 *   if (!tokens) return NextResponse.json({ error: 'HMRC not connected' }, { status: 403 })
 *   // tokens.accessToken and tokens.refreshToken are ready to use
 */
export async function getDecryptedHmrcTokens(userId: string): Promise<{
  accessToken:  string
  refreshToken: string
  tokenExpiry:  string | null
  connectionId: string
} | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('oauth_connections')
    .select('id, access_token, refresh_token, token_expiry')
    .eq('user_id', userId)
    .eq('provider', 'hmrc')
    .single()

  if (error || !data) return null

  try {
    return {
      connectionId: data.id,
      accessToken:  decryptToken(data.access_token),
      refreshToken: decryptToken(data.refresh_token),
      tokenExpiry:  data.token_expiry,
    }
  } catch (e) {
    console.error('Failed to decrypt HMRC tokens:', e)
    return null
  }
}
