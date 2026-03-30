
'use client'

import { useState, useRef } from 'react'
import { ChannelResult, VideoItem } from '../api/channel/route'

// ─── Rank medal colours ───────────────────────────────────────────────────────
const RANK = ['#FFD700', '#C0C0C0', '#CD7F32', '#888', '#666']
const RANK_LABELS = ['#1', '#2', '#3', '#4', '#5']

export default function ShortCard() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<ChannelResult | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const search = async () => {
    const q = query.trim()
    if (!q || status === 'loading') return

    setStatus('loading')
    setResult(null)
    setError('')

    try {
      const res = await fetch(`/api/channel?q=${encodeURIComponent(q)}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      setResult(data as ChannelResult)
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0a0a0a;
          color: #e4e4e4;
          font-family: 'Outfit', sans-serif;
          min-height: 100vh;
        }

        .page {
          max-width: 780px;
          margin: 0 auto;
          padding: 48px 20px 80px;
        }

        /* ── Header ── */
        .header {
          margin-bottom: 44px;
        }
        .header-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: #ff0000;
          margin-bottom: 8px;
        }
        .header-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(44px, 8vw, 72px);
          line-height: 0.92;
          letter-spacing: 1px;
          color: #fff;
        }
        .header-title span { color: #ff0000; }
        .header-sub {
          margin-top: 12px;
          font-size: 13px;
          color: #555;
          font-weight: 300;
        }

        /* ── Search bar ── */
        .search-row {
          display: flex;
          gap: 10px;
          margin-bottom: 48px;
        }
        .search-input {
          flex: 1;
          background: #111;
          border: 1px solid #222;
          border-radius: 10px;
          padding: 13px 18px;
          font-size: 14px;
          font-family: 'Outfit', sans-serif;
          color: #e4e4e4;
          outline: none;
          transition: border-color .2s;
        }
        .search-input::placeholder { color: #333; }
        .search-input:focus { border-color: #ff0000; }
        .search-btn {
          background: #ff0000;
          border: none;
          border-radius: 10px;
          padding: 13px 22px;
          color: #fff;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background .15s, transform .1s;
        }
        .search-btn:hover { background: #cc0000; }
        .search-btn:active { transform: scale(0.97); }
        .search-btn:disabled {
          background: #1a1a1a;
          color: #333;
          cursor: not-allowed;
        }

        /* ── Loading ── */
        .loading-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 60px 0;
          color: #333;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #1a1a1a;
          border-top-color: #ff0000;
          border-radius: 50%;
          animation: spin .7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #333;
        }

        /* ── Error ── */
        .error-box {
          background: #1a0808;
          border: 1px solid #3a1010;
          border-radius: 12px;
          padding: 16px 20px;
          color: #f87171;
          font-size: 13px;
          font-family: 'JetBrains Mono', monospace;
        }

        /* ── Channel header ── */
        .channel-header {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 20px 0 28px;
          border-bottom: 1px solid #161616;
          margin-bottom: 32px;
          animation: fadeUp .35s ease both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .channel-avatar {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #1e1e1e;
          background: #111;
          flex-shrink: 0;
        }
        .channel-avatar-placeholder {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: #1a1a1a;
          border: 2px solid #1e1e1e;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }
        .channel-meta { flex: 1; min-width: 0; }
        .channel-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 26px;
          letter-spacing: .5px;
          color: #fff;
          line-height: 1;
        }
        .channel-handle {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #444;
          margin-top: 4px;
        }
        .channel-subs {
          font-size: 12px;
          color: #555;
          margin-top: 6px;
          font-weight: 300;
        }
        .channel-subs span { color: #999; font-weight: 500; }

        /* ── Section heading ── */
        .section-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: #ff0000;
          margin-bottom: 20px;
        }

        /* ── Video list ── */
        .video-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .video-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 16px;
          border-radius: 12px;
          background: #0f0f0f;
          border: 1px solid #161616;
          cursor: pointer;
          text-decoration: none;
          color: inherit;
          transition: background .15s, border-color .15s, transform .15s;
          animation: fadeUp .3s ease both;
        }
        .video-card:hover {
          background: #141414;
          border-color: #2a2a2a;
          transform: translateX(3px);
        }

        /* stagger animation */
        .video-card:nth-child(1) { animation-delay: 0ms; }
        .video-card:nth-child(2) { animation-delay: 60ms; }
        .video-card:nth-child(3) { animation-delay: 120ms; }
        .video-card:nth-child(4) { animation-delay: 180ms; }
        .video-card:nth-child(5) { animation-delay: 240ms; }

        .rank-badge {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 20px;
          width: 28px;
          text-align: center;
          flex-shrink: 0;
          line-height: 1;
        }

        .video-thumb-wrap {
          position: relative;
          flex-shrink: 0;
          border-radius: 8px;
          overflow: hidden;
          width: 120px;
          height: 68px;
          background: #1a1a1a;
        }
        .video-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .video-duration {
          position: absolute;
          bottom: 4px;
          right: 4px;
          background: rgba(0,0,0,.85);
          color: #fff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          padding: 2px 5px;
          border-radius: 3px;
        }

        .video-info { flex: 1; min-width: 0; }
        .video-title {
          font-size: 13px;
          font-weight: 500;
          color: #ddd;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .video-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 6px;
        }
        .video-views {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #ff4444;
          font-weight: 500;
        }
        .video-dot {
          width: 3px; height: 3px;
          border-radius: 50%;
          background: #333;
          flex-shrink: 0;
        }
        .video-published {
          font-size: 11px;
          color: #444;
        }

        .view-bar-wrap {
          width: 100%;
          height: 2px;
          background: #1a1a1a;
          border-radius: 1px;
          margin-top: 8px;
          overflow: hidden;
        }
        .view-bar {
          height: 100%;
          border-radius: 1px;
          background: linear-gradient(90deg, #ff0000, #ff6b6b);
          transition: width .6s ease;
        }

        /* ── Empty state ── */
        .empty {
          text-align: center;
          padding: 48px 0;
          color: #2a2a2a;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          letter-spacing: 2px;
        }
      `}</style>

      <div className="page">
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
              {result.channelThumbnail ? (
                <img
                  className="channel-avatar"
                  src={result.channelThumbnail}
                  alt={result.channelName}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div className="channel-avatar-placeholder">▶</div>
              )}
              <div className="channel-meta">
                <div className="channel-name">{result.channelName}</div>
                <div className="channel-handle">{result.channelHandle}</div>
                {result.subscriberCount && result.subscriberCount !== 'N/A' && (
                  <div className="channel-subs">
                    <span>{result.subscriberCount}</span> subscribers
                  </div>
                )}
              </div>
            </div>

            {/* Video list */}
            {result.videos.length > 0 ? (
              <>
                <p className="section-label">Top 5 Most Popular</p>
                <VideoList videos={result.videos} />
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

// ─── Video list component ─────────────────────────────────────────────────────

function VideoList({ videos }: { videos: VideoItem[] }) {
  const maxViews = videos[0]?.viewCountRaw || 1

  return (
    <div className="video-list">
      {videos.map((video, i) => (
        <a
          key={video.id}
          className="video-card"
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {/* Rank */}
          <div
            className="rank-badge"
            style={{ color: RANK[i] }}
          >
            {RANK_LABELS[i]}
          </div>

          {/* Thumbnail */}
          <div className="video-thumb-wrap">
            {video.thumbnail && (
              <img
                className="video-thumb"
                src={video.thumbnail}
                alt={video.title}
                loading="lazy"
              />
            )}
            {video.duration && (
              <span className="video-duration">{video.duration}</span>
            )}
          </div>

          {/* Info */}
          <div className="video-info">
            <div className="video-title">{video.title}</div>
            <div className="video-meta">
              <span className="video-views">
                {video.viewCount} views
              </span>
              {video.publishedTime && (
                <>
                  <span className="video-dot" />
                  <span className="video-published">{video.publishedTime}</span>
                </>
              )}
            </div>
            {/* Relative view bar */}
            <div className="view-bar-wrap">
              <div
                className="view-bar"
                style={{
                  width: `${Math.round((video.viewCountRaw / maxViews) * 100)}%`,
                }}
              />
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}
