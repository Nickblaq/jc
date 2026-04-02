
'use client'

import { useState, useRef } from 'react'
import ShortList from './ShortList'
import { ShortItem } from '@/types'

// ─── Rank medal colours ───────────────────────────────────────────────────────
const RANK = ['#FFD700', '#C0C0C0', '#CD7F32', '#888', '#666']
const RANK_LABELS = ['#1', '#2', '#3', '#4', '#5']


 export default function ShortPage() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<ShortItem[] | []>([])
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

     const search = async () => {
    const id = query.trim()
    if (!id || status === 'loading') return

    setStatus('loading')
    setResult(null)
    setError('')

    try {
      const res = await fetch(`/api/shorts?id=${encodeURIComponent(id)}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      setResult(data.shorts as ShortItem[])
      setStatus('done')
    } catch (e: any) {
      setError(e.message || 'Failed to load channel')
      setStatus('error')
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') search()
  }

   return (
     <>
       <div>Short Page</div>
              {/* Header */}
        <div className="header">
          <p className="header-eyebrow">YouTube.js · InnerTube</p>
          <h1 className="header-title">
            Channel<br /><span>Top Videos</span>
          </h1>
          <p className="header-sub">
            Enter a channel name, @handle, or channel ID to see its 5 most viewed videos
          </p>
        </div>

              {/* Search */}
        <div className="search-row">
          <input
            ref={inputRef}
            className="search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="@MrBeast  ·  UCxxxxxx  ·  channel name"
            autoFocus
          />
          <button
            className="search-btn"
            onClick={search}
            disabled={status === 'loading' || !query.trim()}
          >
            {status === 'loading' ? 'Loading...' : 'Search →'}
          </button>
        </div>

        {/* Loading */}
        {status === 'loading' && (
          <div className="loading-wrap">
            <div className="spinner" />
            <p className="loading-text">Fetching via InnerTube</p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="error-box">{error}</div>
        )}
           {/* Results */}
        {status === 'done' && result && (
          <>
            {/* Channel info */}
            <div className="channel-header">
            
              <div className="channel-meta">
                <div className="channel-name">Channel Name</div>
   
              </div>
            </div>

            {/* Video list */}
            {result.length > 0 ? (
              <>
                <p className="section-label">Top 5 Most Popular</p>
                <ShortList shorts={result} />
              </>
            ) : (
              <div className="empty">No videos found</div>
            )}
          </>
        )}

        {/* Idle */}
        {status === 'idle' && (
          <div className="empty">▶ · · ·</div>
        )}
      </div>
    </>
  )
}
     </>
   )
 }
