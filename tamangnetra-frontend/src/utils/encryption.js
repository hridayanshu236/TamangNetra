// src/utils/encryption.js
export async function encryptAndDownload(blob, filename) {
  // Generate a random 256-bit key and IV
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const arrayBuffer = await blob.arrayBuffer()
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, arrayBuffer)

  // Export key so user can decrypt later
  const rawKey = await crypto.subtle.exportKey('raw', key)
  const keyHex = Array.from(new Uint8Array(rawKey))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  // Prepend IV to encrypted data, save as .enc file
  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.byteLength)

  const encBlob = new Blob([combined], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(encBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename + '.enc'
  a.click()
  URL.revokeObjectURL(url)

  // Show key to user to save
  return keyHex  // display in UI so user can decrypt later
}

export async function decryptFile(encBlob, keyHex) {
  const keyBytes = new Uint8Array(keyHex.match(/.{2}/g).map(b => parseInt(b, 16)))
  const key = await crypto.subtle.importKey('raw', keyBytes,
    { name: 'AES-GCM' }, false, ['decrypt'])
  const buf = await encBlob.arrayBuffer()
  const iv = buf.slice(0, 12)
  const data = buf.slice(12)
  return await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, key, data)
}