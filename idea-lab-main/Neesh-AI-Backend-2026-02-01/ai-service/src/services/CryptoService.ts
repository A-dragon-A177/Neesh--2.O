import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * AES-256-GCM encryption/decryption for user API keys stored in the database.
 * 
 * Encrypted format: `iv_hex:authTag_hex:ciphertext_hex`
 * 
 * Backward-compatible: if the stored value is NOT in `iv:tag:ciphertext` format,
 * it is returned as-is (plaintext fallback for existing unencrypted records).
 */

function getEncryptionKey(): Buffer {
    const secret = process.env.API_KEY_ENCRYPTION_SECRET;
    if (!secret) {
        throw new Error('[CryptoService] API_KEY_ENCRYPTION_SECRET is not set in environment');
    }
    // Derive a 32-byte key from the secret using scrypt
    return crypto.scryptSync(secret, 'neesh-api-key-salt', 32);
}

/**
 * Encrypt a plaintext API key for storage.
 * Returns format: `iv_hex:authTag_hex:ciphertext_hex`
 */
export function encryptApiKey(plaintext: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an encrypted API key from storage.
 * If the value is not in the encrypted format (backward compat with existing
 * plaintext records), returns the value as-is.
 */
export function decryptApiKey(storedValue: string): string {
    if (!storedValue) return storedValue;
    
    const parts = storedValue.split(':');
    
    // Backward compatibility: if not in iv:tag:ciphertext format, return as plaintext
    if (parts.length !== 3) {
        return storedValue;
    }
    
    const [ivHex, authTagHex, encrypted] = parts;
    
    // Additional validation: IV should be 32 hex chars (16 bytes), authTag 32 hex chars
    if (ivHex.length !== IV_LENGTH * 2 || authTagHex.length !== AUTH_TAG_LENGTH * 2) {
        // Not our encrypted format — return as plaintext (backward compat)
        return storedValue;
    }
    
    try {
        const key = getEncryptionKey();
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('[CryptoService] Decryption failed, returning raw value (may be plaintext):', 
            error instanceof Error ? error.message : error);
        // If decryption fails (e.g., wrong key, corrupted data), return raw value
        // This prevents locking users out of their API keys during key rotation
        return storedValue;
    }
}
