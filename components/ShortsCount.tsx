
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
    <div style={{ minHeight: '100vh',
                 background: 'var(--bg)',
                 padding: '36px 24px 80px', 
                }}>
      <h1 style={{ marginBottom: 20 }}>YouTube Shorts Count</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Enter channel name, @handle, or channel ID"
          style={{ 
              width: '100%',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '13px 16px',
                fontSize: 14,
                color: 'var(--text)',
                transition: 'border-color .2s',
                 }} />
        
        <button
          onClick={fetchShorts}
          disabled={status === 'loading' || !query.trim()}
          style={{
            padding: '13px 24px',
              background: status === 'loading' ? 'var(--surface)' : 'var(--red)',
              border: 'none',
              borderRadius: 10,
              color: status === 'loading' ? 'var(--dim)' : '#fff',
              fontSize: 14, fontWeight: 700,
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              transition: 'background .15s',
              whiteSpace: 'nowrap',
              minWidth: 100,
          }}
        >
          {status === 'loading' ? 'Loading...' : 'Fetch'}
        </button>
      </div>

      {status === 'error' && <p style={{ color: '#f66' }}>Error: {error}</p>}

      {status === 'done' && (
        <p style={{ color: 'var(--red)', fontSize: 18 }}>
          Shorts found: <strong>{shortsCount ?? 0}</strong>
        </p>
      )}

      {status === 'idle' && <p style={{ color: '#888' }}>Enter a channel above and press Enter or Fetch.</p>}
    </div>
  )
}
