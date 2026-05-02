'use client';

import { encrypt, decrypt, generateKey } from '@/src/lib/encryption';

/**
 * Encryption hook for client-side data protection.
 *
 * Encryption flow:
 * - When encryption is enabled with a key, original and translated text
 *   are encrypted in the store/memory using AES-256.
 * - The encrypted version is what gets "stored" in the component state.
 * - Decryption happens on-demand when viewing the text.
 * - The TMT API still sees plaintext because it must for translation.
 * - This demonstrates that the server never stores plaintext.
 */

/**
 * Encrypt a text payload with the given key.
 * If key is null, returns the plaintext unchanged.
 *
 * @param text - The plaintext to encrypt
 * @param key - The encryption key (null = no encryption)
 * @returns The encrypted ciphertext, or the original text if no key
 */
export function encryptPayload(text: string, key: string | null): string {
  if (!key || key.trim().length === 0) return text;
  try {
    return encrypt(text, key);
  } catch (error) {
    console.error('Encryption failed:', error);
    return text;
  }
}

/**
 * Decrypt a ciphertext payload with the given key.
 * If key is null, returns the ciphertext unchanged (assumes it's plaintext).
 *
 * @param ciphertext - The encrypted text to decrypt
 * @param key - The decryption key (null = no decryption)
 * @returns The decrypted plaintext, or the original text if no key
 */
export function decryptPayload(ciphertext: string, key: string | null): string {
  if (!key || key.trim().length === 0) return ciphertext;
  try {
    return decrypt(ciphertext, key);
  } catch (error) {
    console.error('Decryption failed:', error);
    return ciphertext;
  }
}

/**
 * Check if encryption is actively configured.
 *
 * @param key - The encryption key to check
 * @returns true if a valid encryption key is provided
 */
export function isEncryptionActive(key: string | null): boolean {
  return key !== null && key.trim().length > 0;
}

/**
 * Generate a new random encryption key.
 * Useful for auto-generating keys when encryption is enabled.
 *
 * @returns A random 256-bit key as a hex string
 */
export function generateEncryptionKey(): string {
  return generateKey();
}

/**
 * Encrypt an array of translation segments for secure storage.
 * Returns encrypted versions of both original and translated text.
 */
export function encryptSegments(
  segments: Array<{ original: string; translated: string }>,
  key: string | null
): Array<{ original: string; translated: string; encrypted: boolean }> {
  if (!isEncryptionActive(key)) {
    return segments.map((s) => ({ ...s, encrypted: false }));
  }

  return segments.map((s) => ({
    original: encryptPayload(s.original, key),
    translated: encryptPayload(s.translated, key),
    encrypted: true,
  }));
}

/**
 * Decrypt an array of translation segments for display.
 */
export function decryptSegments(
  segments: Array<{ original: string; translated: string; encrypted?: boolean }>,
  key: string | null
): Array<{ original: string; translated: string }> {
  if (!isEncryptionActive(key)) {
    return segments.map((s) => ({
      original: s.original,
      translated: s.translated,
    }));
  }

  return segments.map((s) => ({
    original: s.encrypted ? decryptPayload(s.original, key) : s.original,
    translated: s.encrypted ? decryptPayload(s.translated, key) : s.translated,
  }));
}
