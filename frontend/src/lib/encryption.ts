/**
 * Client-side AES-256 Encryption Utilities
 *
 * Uses crypto-js for AES-256 encryption/decryption.
 * This encrypts data in transit between client and our API proxy.
 * The TMT API still sees plaintext after our server decrypts.
 */

import CryptoJS from 'crypto-js';

/**
 * Encrypt plaintext using AES-256.
 *
 * @param text - The plaintext string to encrypt
 * @param key - The encryption key (will be hashed to 256 bits)
 * @returns The encrypted ciphertext string
 */
export function encrypt(text: string, key: string): string {
  // Hash the key to ensure it's exactly 256 bits for AES-256
  const hashedKey = CryptoJS.SHA256(key);
  const encrypted = CryptoJS.AES.encrypt(text, hashedKey, {
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.toString();
}

/**
 * Decrypt ciphertext using AES-256.
 *
 * @param ciphertext - The encrypted ciphertext string
 * @param key - The decryption key (must match the encryption key)
 * @returns The decrypted plaintext string
 * @throws Error if decryption fails (wrong key or corrupted data)
 */
export function decrypt(ciphertext: string, key: string): string {
  try {
    const hashedKey = CryptoJS.SHA256(key);
    const decrypted = CryptoJS.AES.decrypt(ciphertext, hashedKey, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const result = decrypted.toString(CryptoJS.enc.Utf8);
    if (!result) {
      throw new Error('Decryption failed: result is empty. Possible wrong key or corrupted data.');
    }
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Decryption error: ${error.message}`);
    }
    throw new Error('Unknown decryption error');
  }
}

/**
 * Generate a random encryption key suitable for AES-256.
 *
 * @returns A random 256-bit key as a hex string
 */
export function generateKey(): string {
  return CryptoJS.lib.WordArray.random(32).toString();
}

/**
 * Hash a string using SHA-256.
 *
 * @param text - The string to hash
 * @returns The SHA-256 hash as a hex string
 */
export function hashSHA256(text: string): string {
  return CryptoJS.SHA256(text).toString();
}
