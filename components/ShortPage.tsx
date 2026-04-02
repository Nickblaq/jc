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
    setResult([])  // Fixed: set to empty array instead of null
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080808; color: #e0e0e0; font-family: 'Outfit', sans-serif; min-height: 100vh; }
        .page { max-width: 820px; margin: 0 auto; padding: 48px 20px 100px; }

        .eyebrow { font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:4px; text-transform:uppercase; color:#ff0000; margin-bottom:8px; }
        .title { font-family:'Bebas Neue',sans-serif; font-size:clamp(42px,8vw,68px); line-height:.9; color:#fff; }
        .title span { color:#ff0000; }
        .subtitle { margin-top:10px; font-size:13px; color:#444; font-weight:300; }

        .search-row { display:flex; gap:10px; margin:36px 0 48px; }
        .search-input { flex:1; background:#111; border:1px solid #1e1e1e; border-radius:10px; padding:12px 16px; font-size:14px; font-family:'Outfit',sans-serif; color:#e0e0e0; outline:none; transition:border-color .2s; }
        .search-input::placeholder { color:#2e2e2e; }
        .search-input:focus { border-color:#ff0000; }
        .search-btn { background:#ff0000; border:none; border-radius:10px; padding:12px 20px; color:#fff; font-family:'Outfit',sans-serif; font-size:14px; font-weight:600; cursor:pointer; transition:background .15s,transform .1s; white-space:nowrap; }
        .search-btn:hover { background:#cc0000; }
        .search-btn:active { transform:scale(.97); }
        .search-btn:disabled { background:#1a1a1a; color:#333; cursor:not-allowed; }

        .loading { display:flex; flex-direction:column; align-items:center; gap:12px; padding:60px 0; }
        .spinner { width:30px; height:30px; border:3px solid #1a1a1a; border-top-color:#ff0000; border-radius:50%; animation:spin .7s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .loading-label { font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:3px; text-transform:uppercase; color:#2a2a2a; }

        .error-box { background:#180a0a; border:1px solid #3a1010; border-radius:10px; padding:14px 18px; color:#f87171; font-size:13px; font-family:'JetBrains Mono',monospace; }

        .ch-header { display:flex; align-items:center; gap:16px; padding:0 0 24px; border-bottom:1px solid #141414; margin-bottom:28px; animation:fadeUp .3s ease both; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .ch-avatar { width:54px; height:54px; border-radius:50%; object-fit:cover; border:2px solid #1a1a1a; background:#111; flex-shrink:0; }
        .ch-avatar-placeholder { width:54px; height:54px; border-radius:50%; background:#1a1a1a; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
        .ch-name { font-family:'Bebas Neue',sans-serif; font-size:24px; color:#fff; line-height:1; }
        .ch-handle { font-family:'JetBrains Mono',monospace; font-size:10px; color:#333; margin-top:3px; }
        .ch-subs { font-size:12px; color:#444; margin-top:5px; }
        .ch-subs em { font-style:normal; color:#888; }

        .section-label { font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:3px; text-transform:uppercase; color:#ff0000; margin-bottom:16px; }

        .layout { display:grid; grid-template-columns:1fr; gap:20px; }
        @media(min-width:680px) { .layout { grid-template-columns:1fr 340px; gap:24px; align-items:start; } }

        .video-list { display:flex; flex-direction:column; gap:2px; }
        .video-card { display:flex; align-items:center; gap:14px; padding:12px 14px; border-radius:10px; background:#0e0e0e; border:1px solid #161616; cursor:pointer; transition:background .15s,border-color .15s,transform .15s; animation:fadeUp .3s ease both; }
        .video-card:hover { background:#131313; border-color:#252525; transform:translateX(2px); }
        .video-card.selected { border-color:#ff000040; background:#1a0a0a; }
        .video-card:nth-child(1){animation-delay:0ms}
        .video-card:nth-child(2){animation-delay:55ms}
        .video-card:nth-child(3){animation-delay:110ms}
        .video-card:nth-child(4){animation-delay:165ms}
        .video-card:nth-child(5){animation-delay:220ms}

        .rank { font-family:'Bebas Neue',sans-serif; font-size:18px; width:24px; text-align:center; flex-shrink:0; line-height:1; }
        .thumb-wrap { position:relative; width:100px; height:56px; border-radius:6px; overflow:hidden; background:#1a1a1a; flex-shrink:0; }
        .thumb { width:100%; height:100%; object-fit:cover; display:block; }
        .dur { position:absolute; bottom:3px; right:3px; background:rgba(0,0,0,.88); color:#fff; font-family:'JetBrains Mono',monospace; font-size:9px; padding:2px 4px; border-radius:3px; }
        .v-info { flex:1; min-width:0; }
        .v-title { font-size:12px; font-weight:500; color:#ccc; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .v-meta { display:flex; align-items:center; gap:8px; margin-top:5px; }
        .v-views { font-family:'JetBrains Mono',monospace; font-size:10px; color:#ff4444; }
        .v-dot { width:2px; height:2px; border-radius:50%; background:#2a2a2a; }
        .v-time { font-size:10px; color:#333; }
        .view-bar-wrap { height:2px; background:#1a1a1a; border-radius:1px; margin-top:6px; overflow:hidden; }
        .view-bar { height:100%; border-radius:1px; background:linear-gradient(90deg,#ff0000,#ff6666); }

        .dl-panel { background:#0e0e0e; border:1px solid #1a1a1a; border-radius:12px; padding:20px; animation:fadeUp .25s ease both; position:sticky; top:24px; }
        .dl-panel-empty { background:#0a0a0a; border:1px dashed #161616; border-radius:12px; padding:40px 20px; text-align:center; color:#222; font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:2px; }
        .dl-thumb-wrap { position:relative; border-radius:8px; overflow:hidden; margin-bottom:16px; aspect-ratio:16/9; background:#111; }
        .dl-thumb { width:100%; height:100%; object-fit:cover; }
        .dl-title { font-size:13px; font-weight:600; color:#ddd; line-height:1.4; margin-bottom:16px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }

        .opt-group { margin-bottom:14px; }
        .opt-label { font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:2px; text-transform:uppercase; color:#444; margin-bottom:8px; }
        .opt-row { display:flex; gap:6px; flex-wrap:wrap; }
        .opt-btn { padding:5px 10px; border-radius:6px; font-size:11px; font-family:'JetBrains Mono',monospace; cursor:pointer; border:1px solid #1e1e1e; background:transparent; color:#444; transition:all .15s; }
        .opt-btn:hover { color:#aaa; border-color:#2a2a2a; }
        .opt-btn.active { border-color:#ff0000; background:#ff000015; color:#ff6666; }
        .opt-btn:disabled { opacity:.4; cursor:not-allowed; }

        .dl-btn { width:100%; padding:11px; border-radius:8px; border:none; font-family:'Outfit',sans-serif; font-size:13px; font-weight:700; cursor:pointer; transition:all .15s; margin-top:4px; }
        .dl-btn-start { background:#ff0000; color:#fff; }
        .dl-btn-start:hover { background:#cc0000; }
        .dl-btn-cancel { background:#1a0a0a; color:#f87171; border:1px solid #3a1010; }
        .dl-btn-cancel:hover { background:#220a0a; }

        .progress-wrap { margin-top:12px; }
        .progress-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
        .progress-label { font-family:'JetBrains Mono',monospace; font-size:10px; color:#555; }
        .progress-pct { font-family:'JetBrains Mono',monospace; font-size:10px; color:#ff6666; }
        .progress-track { height:3px; background:#1a1a1a; border-radius:2px; overflow:hidden; }
        .progress-fill { height:100%; background:linear-gradient(90deg,#ff0000,#ff6666); border-radius:2px; transition:width .3s ease; }

        .status-done { display:flex; align-items:center; gap:6px; margin-top:10px; color:#4ade80; font-family:'JetBrains Mono',monospace; font-size:10px; }
        .status-err { margin-top:10px; color:#f87171; font-family:'JetBrains Mono',monospace; font-size:11px; line-height:1.4; word-break:break-word; }

        .idle-state { text-align:center; padding:48px 0; color:#1e1e1e; font-family:'JetBrains Mono',monospace; font-size:12px; letter-spacing:2px; }

        .meta-row { margin-top:16px; padding-top:14px; border-top:1px solid #141414; display:flex; gap:16px; }
        .meta-item-label { font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:2px; text-transform:uppercase; color:#333; margin-bottom:3px; }
        .meta-item-value { font-size:12px; color:#888; }
      `}</style>
      <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <p className="eyebrow">YouTube.js · InnerTube</p>
        <h1 className="title">
          Channel<br /><span>Top Videos</span>
        </h1>
        <p className="subtitle">
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
      {status === 'done' && result && result.length > 0 && (
        <>
          {/* Channel info */}
          <div className="channel-header">
            <div className="channel-meta">
              <div className="channel-name">Channel Name</div>
            </div>
          </div>

          {/* Video list */}
          <p className="section-label">Top 5 Most Popular</p>
          <ShortList shorts={result} />
        </>
      )}

      {/* Empty results */}
      {status === 'done' && result && result.length === 0 && (
        <div className="empty">No videos found</div>
      )}

      {/* Idle */}
      {status === 'idle' && (
        <div className="empty">▶ · · ·</div>
      )}
      </div>
    </>
  )
}
