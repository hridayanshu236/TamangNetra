'use client';

import CryptoJS from 'crypto-js';
import { createContext, useContext, useState, ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/*  Pure crypto functions                                               */
/* ------------------------------------------------------------------ */

export function encrypt(
  plaintext: string,
  password: string
): { ciphertext: string; iv: string; salt: string } {
  const salt = CryptoJS.lib.WordArray.random(16); // 128-bit salt
  const iv = CryptoJS.lib.WordArray.random(16);   // 128-bit IV

  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,      // 8 words = 256 bits
    iterations: 100_000,
    hasher: CryptoJS.algo.SHA256,
  });

  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return {
    ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Hex),
    iv: iv.toString(CryptoJS.enc.Hex),
    salt: salt.toString(CryptoJS.enc.Hex),
  };
}

export function decrypt(
  ciphertext: string,
  iv: string,
  salt: string,
  password: string
): string {
  const saltWA = CryptoJS.enc.Hex.parse(salt);
  const ivWA = CryptoJS.enc.Hex.parse(iv);
  const ciphertextWA = CryptoJS.enc.Hex.parse(ciphertext);

  const key = CryptoJS.PBKDF2(password, saltWA, {
    keySize: 256 / 32,
    iterations: 100_000,
    hasher: CryptoJS.algo.SHA256,
  });

  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: ciphertextWA,
  });

  const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
    iv: ivWA,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
}

/* ------------------------------------------------------------------ */
/*  React context + hook                                                */
/* ------------------------------------------------------------------ */

interface CryptoContextValue {
  password: string;
  setPassword: (pwd: string) => void;
}

const CryptoContext = createContext<CryptoContextValue | undefined>(undefined);

export function CryptoProvider({ children }: { children: ReactNode }) {
  const [password, setPassword] = useState('');
  return (
    <CryptoContext.Provider value={{ password, setPassword }}>
      {children}
    </CryptoContext.Provider>
  );
}

export function useCrypto(): CryptoContextValue {
  const ctx = useContext(CryptoContext);
  if (!ctx) {
    throw new Error('useCrypto must be used within a CryptoProvider');
  }
  return ctx;
}