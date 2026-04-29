'use client';

import { useState } from 'react';
import { encrypt, decrypt, CryptoProvider, useCrypto } from '@/app/lib/crypto';

function TestCryptoInner() {
  const { password, setPassword } = useCrypto();
  const [plaintext, setPlaintext] = useState('');
  const [result, setResult] = useState<{
    ciphertext: string;
    iv: string;
    salt: string;
    decrypted: string;
  } | null>(null);
  const [error, setError] = useState('');

  const handleEncrypt = () => {
    setError('');
    setResult(null);

    try {
      if (!password) throw new Error('Password is required');
      if (!plaintext) throw new Error('Plaintext is required');

      const enc = encrypt(plaintext, password);
      const dec = decrypt(enc.ciphertext, enc.iv, enc.salt, password);

      setResult({
        ciphertext: enc.ciphertext,
        iv: enc.iv,
        salt: enc.salt,
        decrypted: dec,
      });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>🔐 Crypto Round-Trip Test</h1>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          style={{ width: '100%', padding: 10, fontSize: 14, borderRadius: 6, border: '1px solid #ccc' }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Plaintext</label>
        <input
          type="text"
          value={plaintext}
          onChange={(e) => setPlaintext(e.target.value)}
          placeholder="Type text to encrypt"
          style={{ width: '100%', padding: 10, fontSize: 14, borderRadius: 6, border: '1px solid #ccc' }}
        />
      </div>

      <button
        onClick={handleEncrypt}
        style={{
          padding: '10px 24px',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          borderRadius: 6,
          border: 'none',
          background: '#0070f3',
          color: '#fff',
        }}
      >
        Encrypt & Decrypt
      </button>

      {error && (
        <div style={{ marginTop: 16, padding: 12, background: '#ffebee', color: '#c62828', borderRadius: 6 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 24, background: '#f6f8fa', padding: 20, borderRadius: 8, fontSize: 14 }}>
          <h3 style={{ marginTop: 0 }}>Result</h3>

          <p style={{ margin: '8px 0', wordBreak: 'break-all' }}>
            <strong>Ciphertext (hex):</strong><br />
            <code style={{ fontSize: 12, color: '#333' }}>{result.ciphertext}</code>
          </p>

          <p style={{ margin: '8px 0' }}>
            <strong>IV (hex):</strong> <code>{result.iv}</code>
          </p>

          <p style={{ margin: '8px 0' }}>
            <strong>Salt (hex):</strong> <code>{result.salt}</code>
          </p>

          <div
            style={{
              marginTop: 16,
              padding: 16,
              background: '#fff',
              borderRadius: 6,
              border: '1px solid #e1e4e8',
            }}
          >
            <strong>Decrypted:</strong> {result.decrypted}
            {result.decrypted === plaintext ? (
              <span style={{ color: '#2e7d32', marginLeft: 12, fontWeight: 600 }}>✓ Match</span>
            ) : (
              <span style={{ color: '#c62828', marginLeft: 12, fontWeight: 600 }}>✗ Mismatch</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TestCryptoPage() {
  return (
    <CryptoProvider>
      <TestCryptoInner />
    </CryptoProvider>
  );
}