// src/components/AudioButton.jsx
export default function AudioButton({ text, lang }) {
  const VOICE_MAP = { 'Nepali': 'ne-NP', 'English': 'en-US', 'Tamang': 'ne-NP' }

  const speak = (e) => {
    e.stopPropagation()
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = VOICE_MAP[lang] || 'ne-NP'
    u.rate = lang === 'Nepali' ? 0.85 : lang === 'Tamang' ? 0.8 : 1.0
    u.pitch = lang === 'Tamang' ? 0.95 : 1.0
    window.speechSynthesis.speak(u)
  }

  return (
    <button onClick={speak} title="Listen"
      style={{ background: 'none', border: 'none', cursor: 'pointer',
               fontSize: '0.75rem', color: '#999', marginLeft: 4, padding: 2 }}>
      🔊
    </button>
  )
}