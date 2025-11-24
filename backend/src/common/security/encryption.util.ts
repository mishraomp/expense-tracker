import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * EncryptionUtil - AES-256-GCM encryption for sensitive data like OAuth refresh tokens.
 *
 * Uses:
 * - Algorithm: AES-256-GCM (authenticated encryption)
 * - Key derivation: scrypt (from ENCRYPTION_KEY env var)
 * - IV: Random 16 bytes per encryption (prepended to ciphertext)
 * - Auth tag: 16 bytes (appended to ciphertext)
 *
 * Format: IV (16 bytes) + Ciphertext (variable) + Auth Tag (16 bytes)
 *
 * Environment Variables:
 * - ENCRYPTION_KEY: 32-byte secret key (hex or base64 encoded)
 *   Generate with: openssl rand -hex 32
 */
export class EncryptionUtil {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;
  private static readonly KEY_LENGTH = 32; // 256 bits

  /**
   * Derives encryption key from ENCRYPTION_KEY env var using scrypt.
   * Falls back to a default key for development (should be overridden in production).
   */
  private static deriveKey(): Buffer {
    const envKey = process.env.ENCRYPTION_KEY;

    if (!envKey) {
      console.warn(
        'ENCRYPTION_KEY not set. Using default key for development. DO NOT USE IN PRODUCTION!',
      );
      // Default key for development only (DO NOT USE IN PRODUCTION)
      return scryptSync('default-dev-key-change-me', 'salt', this.KEY_LENGTH);
    }

    // Derive key from env variable using scrypt
    return scryptSync(envKey, 'expense-tracker-salt', this.KEY_LENGTH);
  }

  /**
   * Encrypts plaintext using AES-256-GCM.
   * Returns base64-encoded string: IV + Ciphertext + Auth Tag
   */
  static encrypt(plaintext: string): string {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty plaintext');
    }

    const key = this.deriveKey();
    const iv = randomBytes(this.IV_LENGTH);
    const cipher = createCipheriv(this.ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Combine: IV + Ciphertext + Tag
    const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex'), tag]);

    return combined.toString('base64');
  }

  /**
   * Decrypts ciphertext (base64-encoded: IV + Ciphertext + Auth Tag).
   * Returns original plaintext string.
   */
  static decrypt(ciphertext: string): string {
    if (!ciphertext) {
      throw new Error('Cannot decrypt empty ciphertext');
    }

    const key = this.deriveKey();
    const combined = Buffer.from(ciphertext, 'base64');

    // Extract IV, ciphertext, and tag
    const iv = combined.subarray(0, this.IV_LENGTH);
    const tag = combined.subarray(combined.length - this.TAG_LENGTH);
    const encrypted = combined.subarray(this.IV_LENGTH, combined.length - this.TAG_LENGTH);

    const decipher = createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
