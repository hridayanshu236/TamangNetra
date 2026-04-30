import { useRef, useState, useCallback } from 'react'

export function useWebSocket(backendUrl) {
  const ws = useRef(null)
  const [progress, setProgress] = useState(null)  // {current, total, pct, msg}
  const [status, setStatus] = useState('idle')     // idle | connecting | translating | done | error
  const [result, setResult] = useState(null)        // {download_url, glossary}
  const [error, setError] = useState(null)

  const translate = useCallback(async (file, srcLang, tgtLang) => {
    setStatus('connecting')
    setProgress(null)
    setResult(null)
    setError(null)

    const wsUrl = backendUrl.replace('https://', 'wss://').replace('http://', 'ws://')
    ws.current = new WebSocket(`${wsUrl}/ws/translate`)

    ws.current.onopen = async () => {
      setStatus('translating')
      // Send metadata first
      ws.current.send(JSON.stringify({
        src_lang: srcLang,
        tgt_lang: tgtLang,
        filename: file.name
      }))
      // Then send file bytes
      const buf = await file.arrayBuffer()
      ws.current.send(buf)
    }

    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'progress') setProgress(data)
      else if (data.type === 'done') { setResult(data); setStatus('done') }
      else if (data.type === 'error') { setError(data.msg); setStatus('error') }
    }

    ws.current.onerror = () => { setError('Connection failed'); setStatus('error') }
    ws.current.onclose = () => { if (status === 'translating') setStatus('idle') }
  }, [backendUrl])

  const cancel = useCallback(() => {
    ws.current?.close()
    setStatus('idle')
  }, [])

  return { translate, cancel, progress, status, result, error }
}