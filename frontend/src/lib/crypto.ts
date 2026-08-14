import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getEncryptionKey(): Buffer {
  const secret = process.env.LINKEDIN_TOKEN_ENCRYPTION_KEY
  if (!secret) {
    throw new Error('LINKEDIN_TOKEN_ENCRYPTION_KEY environment variable is required for AES-256-GCM token security.')
  }
  // Ensure key is derived into a 32-byte Buffer via SHA-256
  return crypto.createHash('sha256').update(secret).digest()
}

export type EncryptedPayload = {
  ciphertext: string
  iv: string
  authTag: string
}

// AES-256-GCM Server-Side Encryption
export function encryptToken(text: string): EncryptedPayload {
  const iv = crypto.randomBytes(12) // 12-byte IV for GCM
  const key = getEncryptionKey()
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag().toString('hex')
  
  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag
  }
}

// AES-256-GCM Server-Side Decryption
export function decryptToken(payload: EncryptedPayload): string {
  const key = getEncryptionKey()
  const iv = Buffer.from(payload.iv, 'hex')
  const authTag = Buffer.from(payload.authTag, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}
