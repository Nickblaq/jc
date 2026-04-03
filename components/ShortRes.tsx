
'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ShortItem, ShortResult } from '@/types'

// ─── Rank colours — gold, silver, bronze, then dimmed ────────────────────────
const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32', '#666', '#444']

// ─── Page ─────────────────────────────────────────────────────────────────────

 export default function ShortsRes() {
  const [query,      setQuery]      = useState('')
  const [status,     setStatus]     = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result,     setResult]     = useState<ShortResult | null>(null)
  const [error,      setError]      = useState('')
  const [selected,   setSelected]   = useState<ShortItem | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchShorts = async () => {
    const q = query.trim()
    if (!q || status === 'loading') return

    setStatus('loading')
    setResult(null)
    setSelected(null)
    setError('')

    try {
      const res  = await fetch(`/api/getshorts?q=${encodeURIComponent(q)}`)
      const data = await res.json()

      if (!data) {
        setError("No data available" )
        return;
      }
      setResult(data)
      setStatus('done')

      // Auto-select first if results exist
      if (data.shorts.length > 0) setSelected(data.shorts[0])
    } catch (e: any) {
      setError(e.error ?? `HTTP ${e.status}`)
      setStatus('error')
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') fetchShorts()
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      padding: '36px 24px 80px',
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* ── Nav back ── */}
        <div style={{ marginBottom: 28 }}>
          <Link
            href="/channel"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--dim)',
              textDecoration: 'none', letterSpacing: 1,
              transition: 'color .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--dim)')}
          >
            ← Back
          </Link>
        </div>

        {/* ── Header ── */}
        <header style={{ marginBottom: 36 }}>
          <p style={{
            fontFamily: 'var(--mono)', fontSize: 10,
            letterSpacing: '4px', textTransform: 'uppercase',
            color: 'var(--red)', marginBottom: 10,
          }}>
            youtubei.js · InnerTube · Shorts
          </p>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: 'clamp(32px, 5vw, 52px)',
            lineHeight: 0.95, color: '#fff', marginBottom: 12,
          }}>
            Shorts Videos<br />
            <span style={{ color: 'var(--red)' }}>Shorts Browser</span>
          </h1>
          <p style={{
            fontSize: 14, color: 'var(--dim)',
            lineHeight: 1.65, maxWidth: 480,
          }}>
            Enter any YouTube channel name, @handle or channel ID to load its Shorts.
          </p>
        </header>

        {/* ── Search bar ── */}
        <div style={{
          display: 'flex', gap: 10, marginBottom: 40,
          maxWidth: 600,
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="@MrBeast  ·  MrBeast  ·  UCX6OQ3DkcsbYNE6H8uQQuVA"
              autoFocus
              style={{
                width: '100%',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '13px 16px',
                fontSize: 14,
                color: 'var(--text)',
                transition: 'border-color .2s',
              }}
            />
          </div>
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
            onMouseEnter={e => {
              if (status !== 'loading') (e.currentTarget as HTMLButtonElement).style.background = '#cc0000'
            }}
            onMouseLeave={e => {
              if (status !== 'loading') (e.currentTarget as HTMLButtonElement).style.background = 'var(--red)'
            }}
          >
            {status === 'loading' ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  display: 'inline-block', width: 14, height: 14,
                  border: '2px solid var(--muted)', borderTopColor: 'var(--red)',
                  borderRadius: '50%', animation: 'spin .7s linear infinite',
                }} />
                Loading
              </span>
            ) : 'Search →'}
          </button>
        </div>

        {/* ── Loading state ── */}
        {status === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{
              fontFamily: 'var(--mono)', fontSize: 11,
              letterSpacing: 2, textTransform: 'uppercase', color: 'var(--dim)',
              marginBottom: 16,
            }}>
              Fetching via InnerTube...
            </p>
            {/* Skeleton cards */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{
                height: 88,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                animation: 'pulse 1.4s ease infinite',
                animationDelay: `${i * 0.15}s`,
              }} />
            ))}
          </div>
        )}

        {/* ── Error state ── */}
        {status === 'error' && (
          <div style={{
            background: '#1a0808',
            border: '1px solid #3d1212',
            borderRadius: 12,
            padding: '18px 20px',
            maxWidth: 560,
          }}>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#f87171', letterSpacing: 1, marginBottom: 6 }}>
              ERROR
            </p>
            <p style={{ fontSize: 14, color: '#fca5a5' }}>{error}</p>
            <p style={{ fontSize: 12, color: '#555', marginTop: 10, lineHeight: 1.6 }}>
              Try a different spelling, a @handle, or paste the full channel ID (starts with UC).
            </p>
          </div>
        )}

        {/* ── Results ── */}
        {status === 'done' && (
          <>
            {/* Channel ID badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
              <p style={{
                fontFamily: 'var(--mono)', fontSize: 9,
                letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--dim)',
              }}>
                Channel ID
              </p>
              <code style={{
                fontFamily: 'var(--mono)', fontSize: 11,
                color: 'var(--text)', background: 'var(--surface2)',
                border: '1px solid var(--border)',
                padding: '3px 8px', borderRadius: 4,
              }}>{result?.channelId}</code>
              <p style={{
                fontFamily: 'var(--mono)', fontSize: 9,
                letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--dim)',
              }}>
                · Shorts from {result?.channelName} Channel
              </p>
            </div>

            {result?.shorts.length === 0 ? (
              <div style={{
                border: '1px dashed var(--border)', borderRadius: 12,
                padding: '48px 32px', textAlign: 'center',
              }}>
                <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--dim)' }}>
                  No Shorts found for this channel.
                </p>
              </div>
            ) : (
              /* Two-column: list on left, detail preview on right */
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 340px',
                gap: 20,
                alignItems: 'start',
              }}>

                {/* Left — ranked list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p style={{
                    fontFamily: 'var(--mono)', fontSize: 9,
                    letterSpacing: '3px', textTransform: 'uppercase',
                    color: 'var(--dim)', marginBottom: 8,
                  }}>
                   Shorts
                  </p>

                  {result?.shorts.map((short, i) => (
                    <ShortRow
                      key={short.id}
                      short={short}
                      rank={i}
                      isSelected={selected?.id === short.id}
                      maxViews={parseViews(shorts[0].views)}
                      onClick={() => setSelected(short)}
                    />
                  ))}
                </div>

                {/* Right — detail / preview panel */}
                <div style={{ position: 'sticky', top: 24 }}>
                  {selected && <ShortDetail short={selected} />}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Idle state ── */}
        {status === 'idle' && (
          <div style={{
            border: '1px dashed var(--border)',
            borderRadius: 16,
            padding: '64px 32px',
            textAlign: 'center',
          }}>
            <p style={{
              fontFamily: 'var(--mono)', fontSize: 11,
              letterSpacing: 3, color: 'var(--faint)',
            }}>
              ▶ · · · enter a channel above
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 
 

// ─── ShortRow — list item on the left ────────────────────────────────────────

function ShortRow({
  short, rank, isSelected, maxViews, onClick,
}: {
  short: ShortItem
  rank: number
  isSelected: boolean
  maxViews: number
  onClick: () => void
}) {
  const viewCount = parseViews(short.views)
  const barPct    = maxViews > 0 ? (viewCount / maxViews) * 100 : 0

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 14px',
        borderRadius: 12,
        background: isSelected ? 'var(--surface2)' : 'var(--surface)',
        border: `1px solid ${isSelected ? 'rgba(255,0,0,.35)' : 'var(--border)'}`,
        cursor: 'pointer',
        transition: 'background .15s, border-color .15s, transform .12s',
        transform: isSelected ? 'translateX(3px)' : 'translateX(0)',
        animation: `fadeUp .3s ease both`,
        animationDelay: `${rank * 60}ms`,
      }}
      onMouseEnter={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.background = 'var(--surface2)'
          ;(e.currentTarget as HTMLDivElement).style.transform = 'translateX(2px)'
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)'
          ;(e.currentTarget as HTMLDivElement).style.transform = 'translateX(0)'
        }
      }}
    >
      {/* Rank number */}
      <span style={{
        fontFamily: 'Syne, sans-serif',
        fontWeight: 800,
        fontSize: 20,
        color: RANK_COLORS[rank] ?? '#444',
        width: 28,
        textAlign: 'center',
        flexShrink: 0,
        lineHeight: 1,
      }}>
        {rank + 1}
      </span>

      {/* Thumbnail */}
      <div style={{
        width: 72, height: 72,
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--muted)',
        flexShrink: 0,
        position: 'relative',
      }}>
        {short.thumbnail ? (
          <img
            src={short.thumbnail}
            alt={short.title}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--dim)', fontSize: 20,
          }}>▶</div>
        )}
        {/* Duration pill */}
        {short.duration && (
          <span style={{
            position: 'absolute', bottom: 4, right: 4,
            background: 'rgba(0,0,0,.85)',
            color: '#fff',
            fontFamily: 'var(--mono)', fontSize: 9,
            padding: '2px 5px', borderRadius: 3,
          }}>
            {short.duration}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, fontWeight: 500, color: 'var(--text)',
          lineHeight: 1.4, marginBottom: 5,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {short.title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 10,
            color: isSelected ? 'var(--red)' : 'var(--dim)',
          }}>
            {short.views || '—'}
          </span>
          {short.views && (
            <span style={{ fontSize: 10, color: 'var(--dim)' }}>views</span>
          )}
        </div>
        {/* View bar */}
        <div style={{
          marginTop: 6, height: 2,
          background: 'var(--muted)', borderRadius: 1, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${barPct}%`,
            background: `linear-gradient(90deg, var(--red), #ff6666)`,
            borderRadius: 1,
            transition: 'width .6s ease',
          }} />
        </div>
      </div>

      {/* Selection indicator */}
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: isSelected ? 'var(--red)' : 'transparent',
        flexShrink: 0,
        transition: 'background .15s',
      }} />
    </div>
  )
}

// ─── ShortDetail — preview panel on the right ─────────────────────────────────

function ShortDetail({ short }: { short: ShortItem }) {
  const [copied, setCopied] = useState(false)

  const copyUrl = () => {
    navigator.clipboard.writeText(short.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
      animation: 'fadeUp .25s ease',
    }}>
      {/* Thumbnail — 9:16 crop */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '9 / 16',
        background: '#000',
        overflow: 'hidden',
        maxHeight: 420,
      }}>
        {short.thumbnail ? (
          <img
            src={short.thumbnail}
            alt={short.title}
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', display: 'block',
            }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40, color: 'var(--dim)',
          }}>▶</div>
        )}

        {/* Duration overlay */}
        {short.duration && (
          <div style={{
            position: 'absolute', bottom: 10, right: 10,
            background: 'rgba(0,0,0,.82)',
            fontFamily: 'var(--mono)', fontSize: 11,
            color: '#fff', padding: '3px 8px', borderRadius: 4,
          }}>
            {short.duration}
          </div>
        )}

        {/* Views overlay */}
        {short.views && (
          <div style={{
            position: 'absolute', bottom: 10, left: 10,
            background: 'rgba(0,0,0,.82)',
            fontFamily: 'var(--mono)', fontSize: 10,
            color: '#fff', padding: '3px 8px', borderRadius: 4,
          }}>
            {short.views} views
          </div>
        )}
      </div>

      {/* Info panel */}
      <div style={{ padding: '16px 18px 20px' }}>
        {/* Title */}
        <p style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 700,
          fontSize: 15, color: 'var(--text)',
          lineHeight: 1.4, marginBottom: 14,
        }}>
          {short.title}
        </p>

        {/* ID row */}
        <div style={{ marginBottom: 16 }}>
          <p style={{
            fontFamily: 'var(--mono)', fontSize: 9,
            letterSpacing: 2, textTransform: 'uppercase',
            color: 'var(--dim)', marginBottom: 5,
          }}>Video ID</p>
          <code style={{
            fontFamily: 'var(--mono)', fontSize: 11,
            color: 'var(--text)',
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            padding: '4px 8px', borderRadius: 5,
            display: 'block',
          }}>
            {short.id}
          </code>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/*
            Watch on YouTube — <a> with target="_blank" and e.stopPropagation().
            Opens in new tab only. Never navigates the current page.
          */}
          <a
            href={short.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '11px 16px',
              background: 'var(--red)',
              borderRadius: 9,
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              textDecoration: 'none',
              transition: 'background .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#cc0000')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--red)')}
          >
            ▶ Watch on YouTube
          </a>

          {/* Copy URL */}
          <button
            onClick={copyUrl}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: `1px solid ${copied ? 'var(--green)' : 'var(--border)'}`,
              borderRadius: 9,
              color: copied ? 'var(--green)' : 'var(--dim)',
              fontSize: 13, fontFamily: 'var(--mono)',
              cursor: 'pointer',
              transition: 'all .15s',
              letterSpacing: 1,
            }}
          >
            {copied ? '✓ Copied' : '⎘ Copy URL'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Helper: parse view count string → number for bar sizing ──────────────────

function parseViews(str: string): number {
  if (!str) return 0
  const clean = str.replace(/[^0-9.KkMmBb]/g, '')
  const num   = parseFloat(clean)
  if (isNaN(num)) return 0
  const u = str.toUpperCase()
  if (u.includes('B')) return num * 1_000_000_000
  if (u.includes('M')) return num * 1_000_000
  if (u.includes('K')) return num * 1_000
  return num
}
