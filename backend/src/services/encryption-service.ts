/**
 * Encryption Service
 * Shopify SEO Automation Platform
 *
 * Handles all encryption/decryption operations:
 * - AES-256-GCM for access tokens and sensitive data
 * - Password hashing with bcrypt
 * - Secure token generation
 * - HMAC generation and validation
 *
 * CRITICAL SECURITY NOTES:
 * - Uses AES-256-GCM for authenticated encryption
 * - Encryption key stored in environment variable (32 bytes)
 * - IV (Initialization Vector) is randomly generated for each encryption
 * - Auth tags prevent tampering
 * - Never log decrypted values
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { EncryptedData } from '../types/auth.types';

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly authTagLength = 16; // 128 bits
  private readonly saltRounds = 12; // For bcrypt
  private readonly encryptionKey: Buffer;

  constructor() {
    // Load encryption key from environment variable
    const keyString = process.env.ENCRYPTION_KEY;

    if (!keyString) {
      throw new Error(
        'ENCRYPTION_KEY environment variable is not set. Generate one with: ' +
          'openssl rand -hex 32'
      );
    }

    // Convert hex string to Buffer
    if (keyString.length !== 64) {
      throw new Error(
        'ENCRYPTION_KEY must be 64 hex characters (32 bytes). ' +
          `Current length: ${keyString.length}`
      );
    }

    this.encryptionKey = Buffer.from(keyString, 'hex');
  }

  /**
   * Encrypt Shopify Access Token
   * Uses AES-256-GCM for authenticated encryption
   *
   * @param accessToken - Shopify access token to encrypt
   * @returns Encrypted data with IV and auth tag
   */
  encryptAccessToken(accessToken: string): EncryptedData {
    try {
      // Generate random IV (unique for each encryption)
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

      // Encrypt
      let encrypted = cipher.update(accessToken, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      return {
        encryptedText: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      };
    } catch (error) {
      console.error('Encryption failed:', error.message);
      throw new Error('Failed to encrypt access token');
    }
  }

  /**
   * Decrypt Shopify Access Token
   * Verifies auth tag to prevent tampering
   *
   * @param encryptedData - Encrypted data object
   * @returns Decrypted access token
   */
  decryptAccessToken(encryptedData: EncryptedData): string {
    try {
      const { encryptedText, iv, authTag } = encryptedData;

      if (!authTag) {
        throw new Error('Auth tag is missing from encrypted data');
      }

      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        Buffer.from(iv, 'hex')
      );

      // Set auth tag for verification
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      // Decrypt
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      // Auth tag verification failed or decryption error
      console.error('Decryption failed:', error.message);
      throw new Error('Failed to decrypt access token. Data may be tampered.');
    }
  }

  /**
   * Encrypt Generic Data
   * Can be used for any sensitive data
   *
   * @param data - String data to encrypt
   * @returns Encrypted data with IV and auth tag
   */
  encryptData(data: string): EncryptedData {
    return this.encryptAccessToken(data); // Same implementation
  }

  /**
   * Decrypt Generic Data
   *
   * @param encryptedData - Encrypted data object
   * @returns Decrypted string
   */
  decryptData(encryptedData: EncryptedData): string {
    return this.decryptAccessToken(encryptedData); // Same implementation
  }

  /**
   * Hash Password (One-way)
   * Uses bcrypt with salt rounds
   *
   * @param password - Plain text password
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const hash = await bcrypt.hash(password, this.saltRounds);
      return hash;
    } catch (error) {
      console.error('Password hashing failed:', error.message);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify Password
   * Compares plain text password with hashed version
   *
   * @param password - Plain text password
   * @param hash - Hashed password from database
   * @returns True if password matches
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password verification failed:', error.message);
      return false;
    }
  }

  /**
   * Generate Secure Random Token
   * For API keys, session tokens, etc.
   *
   * @param length - Token length in bytes (default: 32)
   * @returns Hex-encoded random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate Nonce
   * For replay attack prevention
   *
   * @returns Random nonce (16 bytes, hex-encoded)
   */
  generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate HMAC
   * For data integrity verification
   *
   * @param data - Data to sign
   * @param secret - Secret key
   * @returns HMAC signature (hex-encoded)
   */
  generateHMAC(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verify HMAC
   * Constant-time comparison to prevent timing attacks
   *
   * @param data - Original data
   * @param secret - Secret key
   * @param signature - HMAC signature to verify
   * @returns True if signature is valid
   */
  verifyHMAC(data: string, secret: string, signature: string): boolean {
    const expectedSignature = this.generateHMAC(data, secret);

    // Use crypto.timingSafeEqual to prevent timing attacks
    try {
      const expected = Buffer.from(expectedSignature, 'hex');
      const actual = Buffer.from(signature, 'hex');

      if (expected.length !== actual.length) {
        return false;
      }

      return crypto.timingSafeEqual(expected, actual);
    } catch (error) {
      return false;
    }
  }

  /**
   * Hash Data (One-way)
   * For creating unique identifiers
   *
   * @param data - Data to hash
   * @param algorithm - Hash algorithm (default: sha256)
   * @returns Hash (hex-encoded)
   */
  hashData(data: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * Generate API Key
   * Creates a secure API key with prefix
   *
   * @param prefix - Key prefix (e.g., 'sk_live_' or 'sk_test_')
   * @returns Object with key and hash
   */
  generateAPIKey(prefix: string = 'sk_'): {
    key: string;
    hash: string;
    prefix: string;
  } {
    const randomPart = this.generateSecureToken(32);
    const key = `${prefix}${randomPart}`;
    const hash = this.hashData(key);
    const keyPrefix = key.substring(0, 12); // First 12 chars for identification

    return {
      key, // Give this to user (only shown once)
      hash, // Store this in database
      prefix: keyPrefix, // Store for identification
    };
  }

  /**
   * Verify API Key
   * Compares provided key with stored hash
   *
   * @param providedKey - API key from request
   * @param storedHash - Hash from database
   * @returns True if key is valid
   */
  verifyAPIKey(providedKey: string, storedHash: string): boolean {
    const hash = this.hashData(providedKey);
    return hash === storedHash;
  }

  /**
   * Generate TOTP Secret
   * For two-factor authentication
   *
   * @returns Base32-encoded secret
   */
  generateTOTPSecret(): string {
    const buffer = crypto.randomBytes(20);
    // Node.js doesn't support base32 natively, use hex instead
    return buffer.toString('hex');
  }

  /**
   * Encrypt Object
   * Encrypts a JavaScript object
   *
   * @param obj - Object to encrypt
   * @returns Encrypted data
   */
  encryptObject(obj: any): EncryptedData {
    const jsonString = JSON.stringify(obj);
    return this.encryptData(jsonString);
  }

  /**
   * Decrypt Object
   * Decrypts to JavaScript object
   *
   * @param encryptedData - Encrypted data
   * @returns Decrypted object
   */
  decryptObject(encryptedData: EncryptedData): any {
    const jsonString = this.decryptData(encryptedData);
    return JSON.parse(jsonString);
  }

  /**
   * Generate Encryption Key
   * Helper method to generate a new encryption key
   * NOTE: Only use this for initial setup or key rotation
   *
   * @returns Hex-encoded encryption key
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Rotate Encryption Key
   * Re-encrypts data with new key
   * CRITICAL: This should be done carefully with database transaction
   *
   * @param oldKey - Old encryption key
   * @param newKey - New encryption key
   * @param encryptedData - Data encrypted with old key
   * @returns Data encrypted with new key
   */
  static rotateEncryptionKey(
    oldKey: string,
    newKey: string,
    encryptedData: EncryptedData
  ): EncryptedData {
    // Create service with old key
    const oldService = new EncryptionService();
    (oldService as any).encryptionKey = Buffer.from(oldKey, 'hex');

    // Decrypt with old key
    const decrypted = oldService.decryptData(encryptedData);

    // Create service with new key
    const newService = new EncryptionService();
    (newService as any).encryptionKey = Buffer.from(newKey, 'hex');

    // Encrypt with new key
    return newService.encryptData(decrypted);
  }
}

// Singleton instance
let encryptionServiceInstance: EncryptionService | null = null;

/**
 * Get Encryption Service Instance
 * Singleton pattern to ensure single key loading
 */
export function getEncryptionService(): EncryptionService {
  if (!encryptionServiceInstance) {
    encryptionServiceInstance = new EncryptionService();
  }
  return encryptionServiceInstance;
}

// Export convenience functions
export const encryptAccessToken = (token: string): EncryptedData => {
  return getEncryptionService().encryptAccessToken(token);
};

export const decryptAccessToken = (data: EncryptedData): string => {
  return getEncryptionService().decryptAccessToken(data);
};

export const hashPassword = async (password: string): Promise<string> => {
  return getEncryptionService().hashPassword(password);
};

export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return getEncryptionService().verifyPassword(password, hash);
};

export const generateSecureToken = (length?: number): string => {
  return getEncryptionService().generateSecureToken(length);
};

export const generateNonce = (): string => {
  return getEncryptionService().generateNonce();
};
