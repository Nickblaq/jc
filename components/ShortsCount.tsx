
'use client'

import { useState, useRef } from 'react'
import { ShortResult } from '@/types'

export default function ShortsCount() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [shortsCount, setShortsCount] = useState<number | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchShorts = async () => {
    const q = query.trim()
    if (!q || status === 'loading') return

    setStatus('loading')
    setShortsCount(null)
    setError('')

    try {
      const res = await fetch(`/api/getshorts?q=${encodeURIComponent(q)}`)
      const data: ShortResult = await res.json()

      if (!data || !data.shorts) {
        setShortsCount(0)
      } else {
        setShortsCount(data.shorts.length)
      }
      setStatus('done')
    } catch (e: any) {
      setError(e?.error ?? 'Failed to fetch')
      setStatus('error')
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') fetchShorts()
  }

  return (
    <div style={{ minHeight: '100vh', padding: 36, fontFamily: 'sans-serif', color: '#fff', background: '#111' }}>
      <h1 style={{ marginBottom: 20 }}>YouTube Shorts Count</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Enter channel name, @handle, or channel ID"
          style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #555', background: '#222', color: '#fff' }}
        />
        <button
          onClick={fetchShorts}
          disabled={status === 'loading' || !query.trim()}
          style={{
            padding: '10px 16px',
            borderRadius: 6,
            border: 'none',
            background: status === 'loading' ? '#555' : '#e33',
            color: '#fff',
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          }}
        >
          {status === 'loading' ? 'Loading...' : 'Fetch'}
        </button>
      </div>

      {status === 'error' && <p style={{ color: '#f66' }}>Error: {error}</p>}

      {status === 'done' && (
        <p style={{ fontSize: 18 }}>
          Shorts found: <strong>{shortsCount ?? 0}</strong>
        </p>
      )}

      {status === 'idle' && <p style={{ color: '#888' }}>Enter a channel above and press Enter or Fetch.</p>}
    </div>
  )
}
