import { useState, useEffect } from 'react'
import { TAMANG_FACTS } from '../utils/tamangFacts'

export default function ProgressScreen({ progress, onCancel }) {
  const [tipIndex, setTipIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  // Rotate tips every 7 seconds with fade transition
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setTipIndex(i => (i + 1) % TAMANG_FACTS.length)
        setVisible(true)
      }, 400)
    }, 7000)
    return () => clearInterval(interval)
  }, [])

  const tip = TAMANG_FACTS[tipIndex]
  const pct = progress?.pct ?? 0
  const eta = progress && progress.total > 0
    ? Math.round((progress.total - progress.current) / 0.9 / 60)  // ~0.9 req/s
    : null

  return (
    <div style={{ textAlign: 'center', padding: '3rem 2rem', maxWidth: 520, margin: '0 auto' }}>
      {/* Animated spinner ring */}
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ marginBottom: '1.5rem' }}>
        <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e5e5" strokeWidth="6"/>
        <circle cx="40" cy="40" r="34" fill="none" stroke="#6366f1" strokeWidth="6"
          strokeDasharray={`${2 * Math.PI * 34}`}
          strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '40px 40px', transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="40" y="45" textAnchor="middle" fontSize="16" fontWeight="500" fill="#6366f1">{pct}%</text>
      </svg>

      <h2 style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '0.5rem' }}>
        Translating your document
      </h2>

      {progress && (
        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
          Sentence {progress.current} of {progress.total}
          {eta > 0 && ` · ~${eta} min remaining`}
        </p>
      )}

      {/* Tip card */}
      <div style={{
        margin: '2rem 0',
        padding: '1.25rem 1.5rem',
        background: '#f8f7ff',
        borderRadius: 12,
        border: '1px solid #e0dffe',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
        minHeight: 80
      }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6366f1',
                    letterSpacing: '0.05em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
          {tip.label}
        </p>
        <p style={{ fontSize: '0.95rem', color: '#444', lineHeight: 1.6, margin: 0 }}>
          {tip.fact}
        </p>
      </div>

      <button
        onClick={onCancel}
        style={{ color: '#999', background: 'none', border: '1px solid #ddd',
                 borderRadius: 8, padding: '0.5rem 1.25rem', cursor: 'pointer', fontSize: '0.875rem' }}>
        Cancel
      </button>
    </div>
  )
}