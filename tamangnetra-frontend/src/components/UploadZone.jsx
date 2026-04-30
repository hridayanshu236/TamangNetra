import { useRef, useState } from 'react'

const MAX_MB = 1
const ALLOWED = ['.pdf', '.docx', '.csv', '.tsv']

export default function UploadZone({ onFile }) {
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)
  const [err, setErr] = useState(null)

  const validate = (file) => {
    setErr(null)
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!ALLOWED.includes(ext)) { setErr(`Unsupported format. Use: ${ALLOWED.join(', ')}`); return }
    if (file.size > MAX_MB * 1024 * 1024) { setErr(`File too large. Max ${MAX_MB}MB.`); return }
    onFile(file)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); validate(e.dataTransfer.files[0]) }}
      onClick={() => inputRef.current.click()}
      style={{
        border: `2px dashed ${dragging ? '#6366f1' : '#ddd'}`,
        borderRadius: 12, padding: '2.5rem',
        textAlign: 'center', cursor: 'pointer',
        background: dragging ? '#f8f7ff' : 'white',
        transition: 'all 0.2s', marginBottom: '1rem'
      }}>
      <input ref={inputRef} type="file" accept=".pdf,.docx,.csv,.tsv"
             style={{ display: 'none' }} onChange={e => validate(e.target.files[0])} />
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📄</div>
      <p style={{ fontWeight: 500, margin: '0 0 0.25rem' }}>Drop your file here or click to browse</p>
      <p style={{ color: '#999', fontSize: '0.85rem', margin: 0 }}>PDF · DOCX · CSV · TSV · max 1MB</p>
      {err && <p style={{ color: '#e53e3e', fontSize: '0.875rem', marginTop: '0.75rem' }}>{err}</p>}
    </div>
  )
}