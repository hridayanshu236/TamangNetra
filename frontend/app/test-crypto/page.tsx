"use client";

import { useState } from "react";
import { encrypt, decrypt, useCrypto } from "@/app/lib/crypto";

export default function TestCryptoPage() {
  const { password, setPassword } = useCrypto();
  const [plaintext, setPlaintext] = useState("");
  const [encryptedData, setEncryptedData] = useState<{ ciphertext: string, iv: string, salt: string } | null>(null);
  const [decryptedText, setDecryptedText] = useState("");
  const [error, setError] = useState("");

  const handleEncrypt = () => {
    if (!password) {
      setError("Please set a password first.");
      return;
    }
    if (!plaintext) {
      setError("Please enter some text to encrypt.");
      return;
    }
    setError("");
    
    try {
      const result = encrypt(plaintext, password);
      setEncryptedData(result);
      setDecryptedText(""); // clear previous decryption
    } catch (err: any) {
      setError("Encryption failed: " + err.message);
    }
  };

  const handleDecrypt = () => {
    if (!password || !encryptedData) return;
    setError("");
    try {
      const result = decrypt(encryptedData.ciphertext, encryptedData.iv, encryptedData.salt, password);
      setDecryptedText(result);
    } catch (err: any) {
      setError("Decryption failed: " + err.message);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold font-heading">Crypto Test Page</h1>
      
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Master Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="Enter password..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Plaintext</label>
          <textarea
            value={plaintext}
            onChange={(e) => setPlaintext(e.target.value)}
            className="w-full p-2 border rounded-md"
            rows={4}
            placeholder="Enter text to encrypt..."
          />
        </div>

        <button
          onClick={handleEncrypt}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          Encrypt
        </button>
      </div>

      {encryptedData && (
        <div className="mt-8 space-y-4 p-4 border rounded-md bg-gray-50 dark:bg-gray-800">
          <h2 className="text-xl font-semibold">Encrypted Data</h2>
          <div className="space-y-2 text-sm break-all">
            <p><strong>Ciphertext:</strong> {encryptedData.ciphertext}</p>
            <p><strong>IV:</strong> {encryptedData.iv}</p>
            <p><strong>Salt:</strong> {encryptedData.salt}</p>
          </div>
          
          <button
            onClick={handleDecrypt}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition mt-4"
          >
            Decrypt
          </button>
        </div>
      )}

      {decryptedText && (
        <div className="mt-8 p-4 border rounded-md bg-green-50 dark:bg-green-900/20">
          <h2 className="text-xl font-semibold mb-2">Decrypted Result</h2>
          <p className="whitespace-pre-wrap">{decryptedText}</p>
        </div>
      )}
    </div>
  );
}
