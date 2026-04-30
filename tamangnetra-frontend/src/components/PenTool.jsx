// src/components/PenTool.jsx
import { useRef, useState, useEffect } from 'react'

export default function PenTool({ imageUrl, srcLang, tgtLang, backendUrl }) {
  const canvasRef = useRef()
  const [drawing, setDrawing] = useState(false)
  const [start, setStart] = useState(null)
  const [regions, setRegions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!imageUrl) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.src = imageUrl
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
    }
  }, [imageUrl])

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasRef.current.width / rect.width
    const scaleY = canvasRef.current.height / rect.height
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const onMouseDown = (e) => { setDrawing(true); setStart(getPos(e)) }

  const onMouseUp = async (e) => {
    if (!drawing || !start) return
    setDrawing(false)
    const end = getPos(e)
    const bbox = {
      x: Math.min(start.x, end.x), y: Math.min(start.y, end.y),
      w: Math.abs(end.x - start.x), h: Math.abs(end.y - start.y)
    }
    if (bbox.w < 10 || bbox.h < 10) return

    setLoading(true)
    // Convert canvas to base64
    const b64 = canvasRef.current.toDataURL('image/png').split(',')[1]

    const resp = await fetch(`${backendUrl}/ocr/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_b64: b64, src_lang: srcLang,
                             tgt_lang: tgtLang, pen_bbox: bbox })
    })
    const data = await resp.json()
    setLoading(false)

    // Overlay translated text on canvas
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    data.regions.forEach(region => {
      const xs = region.box.map(p => p[0])
      const ys = region.box.map(p => p[1])
      const rx = Math.min(...xs), ry = Math.min(...ys)
      const rw = Math.max(...xs) - rx, rh = Math.max(...ys) - ry
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.fillRect(rx, ry, rw, rh)
      ctx.fillStyle = '#1a1a2e'
      ctx.font = `${Math.max(11, rh * 0.6)}px sans-serif`
      ctx.fillText(region.translated, rx + 2, ry + rh - 3)
    })
    setRegions(r => [...r, ...data.regions])
  }

  return (
    <div>
      <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.75rem' }}>
        Draw a box around any text region to translate it.
      </p>
      <div style={{ position: 'relative', cursor: 'crosshair' }}>
        <canvas ref={canvasRef} onMouseDown={onMouseDown} onMouseUp={onMouseUp}
          style={{ maxWidth: '100%', border: '1px solid #eee', borderRadius: 8 }} />
        {loading && <div style={{ position: 'absolute', top: 8, right: 8,
          background: '#6366f1', color: 'white', borderRadius: 6,
          padding: '4px 10px', fontSize: '0.8rem' }}>Translating...</div>}
      </div>
    </div>
  )
}