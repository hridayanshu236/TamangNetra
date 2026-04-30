import { useState } from 'react'

const LANGUAGES = ['English', 'Nepali', 'Tamang']

export default function LanguageSelector({ src, tgt, onChange }) {
  const swap = () => onChange(tgt, src)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
      <select value={src} onChange={e => onChange(e.target.value, tgt)}
        style={{ flex: 1, padding: '0.6rem 0.9rem', borderRadius: 8,
                 border: '1px solid #ddd', fontSize: '0.95rem', background: 'white' }}>
        {LANGUAGES.map(l => <option key={l} disabled={l === tgt}>{l}</option>)}
      </select>

      <button onClick={swap} title="Swap languages"
        style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #ddd',
                 background: 'white', cursor: 'pointer', fontSize: '1.1rem',
                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                 transition: 'transform 0.3s', flexShrink: 0 }}
        onMouseEnter={e => e.target.style.transform = 'rotate(180deg)'}
        onMouseLeave={e => e.target.style.transform = 'rotate(0deg)'}>
        ⇄
      </button>

      <select value={tgt} onChange={e => onChange(src, e.target.value)}
        style={{ flex: 1, padding: '0.6rem 0.9rem', borderRadius: 8,
                 border: '1px solid #ddd', fontSize: '0.95rem', background: 'white' }}>
        {LANGUAGES.map(l => <option key={l} disabled={l === src}>{l}</option>)}
      </select>
    </div>
  )
}