"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import CryptoJS from 'crypto-js';

const KEY_LEN_WORDS = 256 / 32; // 8 words = 32 bytes
const IV_LEN_BYTES = 16;
const SALT_LEN_BYTES = 16;
const ITERATIONS = 100000;

export function encrypt(plaintext: string, password: string): { ciphertext: string, iv: string, salt: string } {
  const salt = CryptoJS.lib.WordArray.random(SALT_LEN_BYTES);
  const iv = CryptoJS.lib.WordArray.random(IV_LEN_BYTES);

  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: KEY_LEN_WORDS,
    iterations: ITERATIONS,
    hasher: CryptoJS.algo.SHA256
  });

  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  return {
    ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
    iv: iv.toString(CryptoJS.enc.Base64),
    salt: salt.toString(CryptoJS.enc.Base64)
  };
}

export function decrypt(ciphertext: string, iv: string, salt: string, password: string): string {
  const saltWA = CryptoJS.enc.Base64.parse(salt);
  const ivWA = CryptoJS.enc.Base64.parse(iv);

  const key = CryptoJS.PBKDF2(password, saltWA, {
    keySize: KEY_LEN_WORDS,
    iterations: ITERATIONS,
    hasher: CryptoJS.algo.SHA256
  });

  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Base64.parse(ciphertext)
  });

  const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
    iv: ivWA,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
}

interface CryptoContextType {
  password: string;
  setPassword: (pwd: string) => void;
}

const CryptoContext = createContext<CryptoContextType | undefined>(undefined);

export function CryptoProvider({ children }: { children: ReactNode }) {
  const [password, setPassword] = useState<string>('');

  return (
    <CryptoContext.Provider value={{ password, setPassword }}>
      {children}
    </CryptoContext.Provider>
  );
}

export function useCrypto() {
  const context = useContext(CryptoContext);
  if (context === undefined) {
    throw new Error('useCrypto must be used within a CryptoProvider');
  }
  return context;
}
