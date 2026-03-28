
'use client'

import { useState, useRef } from 'react'
import { ChannelResult, VideoItem } from '@/types'
import VideoCard from '@/components/VideoCard'

const RANK_COLOR = ['#FFD700', '#C0C0C0', '#CD7F32', '#666', '#555']
const RANK_LABEL = ['#1', '#2', '#3', '#4', '#5']

type DownloadType = 'videoandaudio' | 'audio'
type Quality = 'best' | '1080p' | '720p' | '480p' | '360p'

interface DownloadState {
  videoId: string
  status: 'idle' | 'starting' | 'downloading' | 'done' | 'error'
  progress: number
  error?: string
}

export default function ChannelPage() {
  const [query, setQuery]   = useState('')
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<ChannelResult | null>(null)
  const [fetchError, setFetchError] = useState('')

  // Download panel state — one active download at a time
  const [activeVideo, setActiveVideo]     = useState<VideoItem | null>(null)
  const [dlType, setDlType]               = useState<DownloadType>('videoandaudio')
  const [dlQuality, setDlQuality]         = useState<Quality>('best')
  const [dlState, setDlState]             = useState<DownloadState | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // ── Channel search ────────────────────────────────────────────────────────

  const searchChannel = async () => {
    const q = query.trim()
    if (!q || fetchStatus === 'loading') return
    setFetchStatus('loading')
    setResult(null)
    setFetchError('')
    setActiveVideo(null)
    setDlState(null)

    try {
      const res  = await fetch(`/api/channel?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load channel')
      setResult(data as ChannelResult)
      setFetchStatus('done')
    } catch (e: any) {
      setFetchError(e.message)
      setFetchStatus('error')
    }
  }

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') searchChannel() }

  // ── Download ──────────────────────────────────────────────────────────────

  const startDownload = async (video: VideoItem) => {
    // Cancel any in-progress download
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setDlState({ videoId: video.id, status: 'starting', progress: 0 })

    const url = `/api/download?id=${video.id}&type=${dlType}&quality=${dlQuality}`

    try {
      const res = await fetch(url, { signal: abortRef.current.signal })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error || `Server error ${res.status}`)
      }

      const contentLength = parseInt(res.headers.get('content-length') || '0')
      const title = res.headers.get('x-video-title') || video.title

      // Build filename from content-disposition
      const disposition = res.headers.get('content-disposition') || ''
      const match = disposition.match(/filename="(.+?)"/)
      const filename = match?.[1] || `${video.id}.mp4`

      setDlState({ videoId: video.id, status: 'downloading', progress: 0 })

      // Read the stream in chunks and track progress
      const reader = res.body!.getReader()
      const chunks: Uint8Array[] = []
      let loaded = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        loaded += value.byteLength
        const pct = contentLength > 0 ? Math.round((loaded / contentLength) * 100) : -1
        setDlState({ videoId: video.id, status: 'downloading', progress: pct })
      }

      // Assemble and trigger browser Save dialog
      const blob = new Blob(chunks)
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      a.click()
      URL.revokeObjectURL(blobUrl)

      setDlState({ videoId: video.id, status: 'done', progress: 100 })

    } catch (e: any) {
      if (e.name === 'AbortError') return
      setDlState({ videoId: video.id, status: 'error', progress: 0, error: e.message })
    }
  }

  const cancelDownload = () => {
    abortRef.current?.abort()
    setDlState(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080808; color: #e0e0e0; font-family: 'Outfit', sans-serif; min-height: 100vh; }

        .page { max-width: 820px; margin: 0 auto; padding: 48px 20px 100px; }

        /* Header */
        .eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 4px; text-transform: uppercase; color: #ff0000; margin-bottom: 8px; }
        .title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(42px, 8vw, 68px); line-height: .9; color: #fff; }
        .title span { color: #ff0000; }
        .subtitle { margin-top: 10px; font-size: 13px; color: #444; font-weight: 300; }

        /* Search */
        .search-row { display: flex; gap: 10px; margin: 36px 0 48px; }
        .search-input {
          flex: 1; background: #111; border: 1px solid #1e1e1e; border-radius: 10px;
          padding: 12px 16px; font-size: 14px; font-family: 'Outfit', sans-serif;
          color: #e0e0e0; outline: none; transition: border-color .2s;
        }
        .search-input::placeholder { color: #2e2e2e; }
        .search-input:focus { border-color: #ff0000; }
        .search-btn {
          background: #ff0000; border: none; border-radius: 10px; padding: 12px 20px;
          color: #fff; font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: background .15s, transform .1s; white-space: nowrap;
        }
        .search-btn:hover { background: #cc0000; }
        .search-btn:active { transform: scale(.97); }
        .search-btn:disabled { background: #1a1a1a; color: #333; cursor: not-allowed; }

        /* Loading */
        .loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; }
        .spinner { width: 30px; height: 30px; border: 3px solid #1a1a1a; border-top-color: #ff0000; border-radius: 50%; animation: spin .7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #2a2a2a; }

        /* Error */
        .error-box { background: #180a0a; border: 1px solid #3a1010; border-radius: 10px; padding: 14px 18px; color: #f87171; font-size: 13px; font-family: 'JetBrains Mono', monospace; }

        /* Channel header */
        .ch-header { display: flex; align-items: center; gap: 16px; padding: 0 0 24px; border-bottom: 1px solid #141414; margin-bottom: 28px; animation: fadeUp .3s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .ch-avatar { width: 54px; height: 54px; border-radius: 50%; object-fit: cover; border: 2px solid #1a1a1a; background: #111; flex-shrink: 0; }
        .ch-avatar-placeholder { width: 54px; height: 54px; border-radius: 50%; background: #1a1a1a; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .ch-name { font-family: 'Bebas Neue', sans-serif; font-size: 24px; color: #fff; line-height: 1; }
        .ch-handle { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #333; margin-top: 3px; }
        .ch-subs { font-size: 12px; color: #444; margin-top: 5px; }
        .ch-subs em { font-style: normal; color: #888; }

        /* Section label */
        .section-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: #ff0000; margin-bottom: 16px; }

        /* Two-column layout */
        .layout { display: grid; grid-template-columns: 1fr; gap: 20px; }
        @media (min-width: 680px) { .layout { grid-template-columns: 1fr 340px; gap: 24px; align-items: start; } }

        /* Video list */
        .video-list { display: flex; flex-direction: column; gap: 2px; }
        .video-card {
          display: flex; align-items: center; gap: 14px;
          padding: 12px 14px; border-radius: 10px;
          background: #0e0e0e; border: 1px solid #161616;
          cursor: pointer; transition: background .15s, border-color .15s, transform .15s;
          animation: fadeUp .3s ease both;
        }
        .video-card:hover { background: #131313; border-color: #252525; transform: translateX(2px); }
        .video-card.selected { border-color: #ff000040; background: #1a0a0a; }
        .video-card:nth-child(1) { animation-delay: 0ms; }
        .video-card:nth-child(2) { animation-delay: 55ms; }
        .video-card:nth-child(3) { animation-delay: 110ms; }
        .video-card:nth-child(4) { animation-delay: 165ms; }
        .video-card:nth-child(5) { animation-delay: 220ms; }

        .rank { font-family: 'Bebas Neue', sans-serif; font-size: 18px; width: 24px; text-align: center; flex-shrink: 0; line-height: 1; }
        .thumb-wrap { position: relative; width: 100px; height: 56px; border-radius: 6px; overflow: hidden; background: #1a1a1a; flex-shrink: 0; }
        .thumb { width: 100%; height: 100%; object-fit: cover; display: block; }
        .dur { position: absolute; bottom: 3px; right: 3px; background: rgba(0,0,0,.88); color: #fff; font-family: 'JetBrains Mono', monospace; font-size: 9px; padding: 2px 4px; border-radius: 3px; }
        .v-info { flex: 1; min-width: 0; }
        .v-title { font-size: 12px; font-weight: 500; color: #ccc; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .v-meta { display: flex; align-items: center; gap: 8px; margin-top: 5px; }
        .v-views { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #ff4444; }
        .v-dot { width: 2px; height: 2px; border-radius: 50%; background: #2a2a2a; }
        .v-time { font-size: 10px; color: #333; }
        .view-bar-wrap { height: 2px; background: #1a1a1a; border-radius: 1px; margin-top: 6px; overflow: hidden; }
        .view-bar { height: 100%; border-radius: 1px; background: linear-gradient(90deg,#ff0000,#ff6666); }

        /* Download panel */
        .dl-panel {
          background: #0e0e0e; border: 1px solid #1a1a1a; border-radius: 12px;
          padding: 20px; animation: fadeUp .25s ease both;
          position: sticky; top: 24px;
        }
        .dl-panel-empty {
          background: #0a0a0a; border: 1px dashed #161616; border-radius: 12px;
          padding: 40px 20px; text-align: center;
          color: #222; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 2px;
        }

        .dl-thumb-wrap { position: relative; border-radius: 8px; overflow: hidden; margin-bottom: 16px; aspect-ratio: 16/9; background: #111; }
        .dl-thumb { width: 100%; height: 100%; object-fit: cover; }
        .dl-title { font-size: 13px; font-weight: 600; color: #ddd; line-height: 1.4; margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        /* Format options */
        .opt-group { margin-bottom: 14px; }
        .opt-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #444; margin-bottom: 8px; }
        .opt-row { display: flex; gap: 6px; flex-wrap: wrap; }
        .opt-btn {
          padding: 5px 10px; border-radius: 6px; font-size: 11px;
          font-family: 'JetBrains Mono', monospace; cursor: pointer; border: 1px solid #1e1e1e;
          background: transparent; color: #444; transition: all .15s;
        }
        .opt-btn:hover { color: #aaa; border-color: #2a2a2a; }
        .opt-btn.active { border-color: #ff0000; background: #ff000015; color: #ff6666; }

        /* Download button */
        .dl-btn {
          width: 100%; padding: 11px; border-radius: 8px; border: none;
          font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all .15s; margin-top: 4px;
        }
        .dl-btn-start { background: #ff0000; color: #fff; }
        .dl-btn-start:hover { background: #cc0000; }
        .dl-btn-cancel { background: #1a0a0a; color: #f87171; border: 1px solid #3a1010; }
        .dl-btn-cancel:hover { background: #220a0a; }
        .dl-btn:disabled { background: #1a1a1a; color: #333; cursor: not-allowed; }

        /* Progress bar */
        .progress-wrap { margin-top: 12px; }
        .progress-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .progress-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #555; }
        .progress-pct { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #ff6666; }
        .progress-track { height: 3px; background: #1a1a1a; border-radius: 2px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg,#ff0000,#ff6666); border-radius: 2px; transition: width .3s ease; }

        /* Status badges */
        .status-done { display: flex; align-items: center; gap: 6px; margin-top: 10px; color: #4ade80; font-family: 'JetBrains Mono', monospace; font-size: 10px; }
        .status-err { margin-top: 10px; color: #f87171; font-family: 'JetBrains Mono', monospace; font-size: 10px; }

        .idle-state { text-align: center; padding: 48px 0; color: #1e1e1e; font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 2px; }
      `}</style>

      <div className="page">
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <p className="eyebrow">youtubei.js · InnerTube</p>
          <h1 className="title">Channel<br /><span>Explorer</span></h1>
          <p className="subtitle">Search any channel · Browse top videos · Download any format</p>
        </div>

        {/* Search */}
        <div className="search-row">
          <input
            className="search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="@handle  ·  UCxxxxxx  ·  channel name"
            autoFocus
          />
          <button
            className="search-btn"
            onClick={searchChannel}
            disabled={fetchStatus === 'loading' || !query.trim()}
          >
            {fetchStatus === 'loading' ? 'Loading...' : 'Search →'}
          </button>
        </div>

        {/* Loading */}
        {fetchStatus === 'loading' && (
          <div className="loading">
            <div className="spinner" />
            <p className="loading-label">Fetching via InnerTube</p>
          </div>
        )}

        {/* Error */}
        {fetchStatus === 'error' && <div className="error-box">{fetchError}</div>}

        {/* Results */}
        {fetchStatus === 'done' && result && (
          <>
            {/* Channel header */}
            <div className="ch-header">
              {result.channelThumbnail
                ? <img className="ch-avatar" src={result.channelThumbnail} alt={result.channelName} />
                : <div className="ch-avatar-placeholder">▶</div>
              }
              <div>
                <div className="ch-name">{result.channelName}</div>
                {result.channelHandle && <div className="ch-handle">{result.channelHandle}</div>}
                {result.subscriberCount && <div className="ch-subs"><em>{result.subscriberCount}</em> subscribers</div>}
              </div>
            </div>

            <p className="section-label" style={{ marginBottom: 20 }}>Top 5 Most Popular</p>

            <div className="layout">
              {/* Left: video list */}
              <div>
                <div className="video-list">
                  {result.videos.map((v, i) => {
                    const maxViews = result.videos[0].viewCountRaw || 1
                    const barPct = Math.round((v.viewCountRaw / maxViews) * 100)
                    const isSelected = activeVideo?.id === v.id
                    return (
                      <div
                        key={v.id}
                        className={`video-card${isSelected ? ' selected' : ''}`}
                        onClick={() => {
                          setActiveVideo(v)
                          setDlState(null)
                        }}
                      >
                        <div className="rank" style={{ color: RANK_COLOR[i] }}>
                          {RANK_LABEL[i]}
                        </div>
                        <div className="thumb-wrap">
                          {v.thumbnail && <img className="thumb" src={v.thumbnail} alt={v.title} loading="lazy" />}
                          {v.duration && <span className="dur">{v.duration}</span>}
                        </div>
                        <div className="v-info">
                          <div className="v-title">{v.title}</div>
                          <div className="v-meta">
                            <span className="v-views">{v.viewCount} views</span>
                            {v.publishedTime && <><span className="v-dot" /><span className="v-time">{v.publishedTime}</span></>}
                          </div>
                          <div className="view-bar-wrap">
                            <div className="view-bar" style={{ width: `${barPct}%` }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Right: download panel */}
              <div>
                {activeVideo
                  ? <DownloadPanel
                      video={activeVideo}
                      dlType={dlType}
                      dlQuality={dlQuality}
                      dlState={dlState}
                      onTypeChange={setDlType}
                      onQualityChange={setDlQuality}
                      onDownload={startDownload}
                      onCancel={cancelDownload}
                    />
                  : <div className="dl-panel-empty">← select a video<br />to download</div>
                }
              </div>
            </div>
          </>
        )}

        {/* Idle */}
        {fetchStatus === 'idle' && (
          <div className="idle-state">▶ · · ·</div>
        )}
      </div>
    </>
  )
}

// ─── Download panel component ─────────────────────────────────────────────────

interface PanelProps {
  video: VideoItem
  dlType: DownloadType
  dlQuality: Quality
  dlState: DownloadState | null
  onTypeChange: (t: DownloadType) => void
  onQualityChange: (q: Quality) => void
  onDownload: (v: VideoItem) => void
  onCancel: () => void
}

function DownloadPanel({
  video, dlType, dlQuality, dlState,
  onTypeChange, onQualityChange, onDownload, onCancel,
}: PanelProps) {
  const isActive    = dlState?.videoId === video.id && (dlState.status === 'starting' || dlState.status === 'downloading')
  const isDone      = dlState?.videoId === video.id && dlState.status === 'done'
  const isError     = dlState?.videoId === video.id && dlState.status === 'error'
  const progress    = dlState?.videoId === video.id ? dlState.progress : 0
  const showProgress = isActive && progress >= 0

  const TYPES: { value: DownloadType; label: string }[] = [
    { value: 'videoandaudio', label: 'Video + Audio' },
    { value: 'audio',         label: 'Audio only' },
  ]

  const QUALITIES: { value: Quality; label: string }[] = [
    { value: 'best',  label: 'Best' },
    { value: '1080p', label: '1080p' },
    { value: '720p',  label: '720p' },
    { value: '480p',  label: '480p' },
    { value: '360p',  label: '360p' },
  ]

  return (
    <div className="dl-panel">
      {/* Thumbnail */}
      <div className="dl-thumb-wrap">
        {video.thumbnail && (
          <img className="dl-thumb" src={video.thumbnail} alt={video.title} />
        )}
      </div>

      {/* Title */}
      <div className="dl-title">{video.title}</div>

      {/* Type selector — hide quality selector for audio-only */}
      <div className="opt-group">
        <p className="opt-label">Format</p>
        <div className="opt-row">
          {TYPES.map(t => (
            <button
              key={t.value}
              className={`opt-btn${dlType === t.value ? ' active' : ''}`}
              onClick={() => onTypeChange(t.value)}
              disabled={isActive}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {dlType === 'videoandaudio' && (
        <div className="opt-group">
          <p className="opt-label">Quality</p>
          <div className="opt-row">
            {QUALITIES.map(q => (
              <button
                key={q.value}
                className={`opt-btn${dlQuality === q.value ? ' active' : ''}`}
                onClick={() => onQualityChange(q.value)}
                disabled={isActive}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action button */}
      {isActive
        ? <button className="dl-btn dl-btn-cancel" onClick={onCancel}>
            Cancel download
          </button>
        : <button
            className="dl-btn dl-btn-start"
            onClick={() => onDownload(video)}
          >
            {isDone ? 'Download again ↓' : 'Download ↓'}
          </button>
      }

      {/* Progress */}
      {showProgress && (
        <div className="progress-wrap">
          <div className="progress-row">
            <span className="progress-label">
              {dlState?.status === 'starting' ? 'Preparing...' : 'Downloading...'}
            </span>
            {progress > 0 && (
              <span className="progress-pct">{progress}%</span>
            )}
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: progress > 0 ? `${progress}%` : '100%', opacity: progress > 0 ? 1 : 0.4 }}
            />
          </div>
        </div>
      )}

      {/* Done */}
      {isDone && (
        <div className="status-done">
          <span>✓</span>
          <span>Saved to your downloads folder</span>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="status-err">
          ✕ {dlState?.error || 'Download failed'}
        </div>
      )}
      <VideoCard video={activeVideo} />

      {/* Metadata */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #141414', display: 'flex', gap: 16 }}>
        {video.duration && (
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#333', marginBottom: 3 }}>Duration</div>
            <div style={{ fontSize: 12, color: '#888' }}>{video.duration}</div>
          </div>
        )}
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#333', marginBottom: 3 }}>Views</div>
          <div style={{ fontSize: 12, color: '#888' }}>{video.viewCount}</div>
        </div>
        {video.publishedTime && (
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#333', marginBottom: 3 }}>Published</div>
            <div style={{ fontSize: 12, color: '#888' }}>{video.publishedTime}</div>
          </div>
        )}
      </div>
    </div>
  )
}
