export default function ResultViewer({ translatedBlocks, glossary, tgtLang }) {
  // translatedBlocks: [{original: str, translated: str}]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      {/* Original */}
      <div>
        <h3 style={{ fontSize: '0.8rem', color: '#999', letterSpacing: '0.05em',
                     textTransform: 'uppercase', marginBottom: '1rem' }}>Original</h3>
        {translatedBlocks.map((block, i) => (
          <p key={i} style={{ lineHeight: 1.7, marginBottom: '1rem', color: '#444' }}>
            {block.original}
          </p>
        ))}
      </div>

      {/* Translated — hover shows original */}
      <div>
        <h3 style={{ fontSize: '0.8rem', color: '#6366f1', letterSpacing: '0.05em',
                     textTransform: 'uppercase', marginBottom: '1rem' }}>Translated</h3>
        {translatedBlocks.map((block, i) => (
          <HoverParagraph key={i} block={block} tgtLang={tgtLang} />
        ))}
      </div>
    </div>
  )
}

function HoverParagraph({ block, tgtLang }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      data-original={block.original}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', lineHeight: 1.7, marginBottom: '1rem',
        padding: '0.5rem', borderRadius: 6,
        background: hovered ? '#f8f7ff' : 'transparent',
        border: `1px solid ${hovered ? '#e0dffe' : 'transparent'}`,
        cursor: 'default', transition: 'all 0.15s'
      }}>
      <span>{block.translated}</span>
      {hovered && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, right: 0,
          background: '#1a1a2e', color: '#e2e8f0',
          borderRadius: 8, padding: '0.6rem 0.9rem',
          fontSize: '0.8rem', lineHeight: 1.5, marginBottom: 6,
          zIndex: 10, pointerEvents: 'none'
        }}>
          <span style={{ color: '#a78bfa', fontSize: '0.7rem' }}>Original:</span><br/>
          {block.original}
        </div>
      )}
      <AudioButton text={block.translated} lang={tgtLang} />
    </div>
  )
}