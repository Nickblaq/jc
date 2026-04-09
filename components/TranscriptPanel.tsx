
'use client'

import { useState, useRef } from 'react'
import { TranscriptSegment, TranscriptResponse } from '@/types'

// ── Component ─────────────────────────────────────────────────────────────────

export default function TranscriptPanel() {
  const [input,   setInput]   = useState('')
  const [lang,    setLang]    = useState('')
  const [data,    setData]    = useState<TranscriptResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [copied,  setCopied]  = useState(false)
  const [search,  setSearch]  = useState('')
  const [active,  setActive]  = useState<number | null>(null)
const [results, setResults] = useState(null)
  const listRef = useRef<HTMLDivElement>(null)

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchTranscript = async () => {
    const trimmed = input.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setData(null)
    setCopied(false)
    setSearch('')
    setActive(null)

    const qs = new URLSearchParams({ id: trimmed })
    if (lang.trim()) qs.set('lang', lang.trim())

    try {
      const res  = await fetch(`/api/transcript?${qs}`)
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? `Error ${res.status}`)
      } else {
        setData(json)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Network error')
    } finally {
      setLoading(false)
    }
  }

  // ── Copy plain text ───────────────────────────────────────────────────────

  const copyText = async () => {
    if (!data?.fullText) return
    try {
      await navigator.clipboard.writeText(data.fullText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard denied */ }
  }

  // ── Download as .txt ──────────────────────────────────────────────────────

  const downloadTxt = () => {
    if (!data) return
    const lines = data.segments.map(
      s => `[${fmtTime(s.start)} → ${fmtTime(s.end)}]  ${s.text}`
    )
    const blob = new Blob(
      [`${data.title}\n${'─'.repeat(60)}\n\n${lines.join('\n')}`],
      { type: 'text/plain' }
    )
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `transcript-${data.videoId}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // ── Filtered segments ──────────────────────────────────────────────────────

  const filtered = data?.segments.filter(s =>
    !search || s.text.toLowerCase().includes(search.toLowerCase())
  ) ?? []


  const fetchRaw = async () => {
    const trimmed = input.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setResults(null)

    const qs = new URLSearchParams({ id: trimmed })
   // if (lang.trim()) qs.set('lang', lang.trim())

    try {
      const res  = await fetch(`/api/info?${qs}`)
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? `Error ${res.status}`)
      } else {
        setResults(json)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Network error')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-800">
        <span className="text-indigo-400 text-lg">📝</span>
        <h2 className="text-sm font-semibold text-gray-300">Transcript Fetcher</h2>
      </div>

      <div className="p-5 space-y-4">
        {/* Input row */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && fetchTranscript()}
            placeholder="Video ID or YouTube URL"
            className="flex-1 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-sm
                       text-white placeholder:text-gray-500 focus:outline-none focus:ring-2
                       focus:ring-indigo-500 transition"
          />
          <input
            value={lang}
            onChange={e => setLang(e.target.value)}
            placeholder="lang (e.g. en)"
            className="w-28 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-sm
                       text-white placeholder:text-gray-500 focus:outline-none focus:ring-2
                       focus:ring-indigo-500 transition"
          />
          <button
            onClick={fetchRaw}
            disabled={loading || !input.trim()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500
                       disabled:opacity-40 disabled:cursor-not-allowed text-sm
                       font-semibold text-white transition whitespace-nowrap"
          >
            {loading ? <Spin /> : 'Get Transcript'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-950 border border-red-800 p-3">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        {/* Results */}
        {data && (
          <div className="space-y-3">
            {/* Meta bar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{data.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {data.segments.length} segments · {fmtTime(data.duration)} ·{' '}
                  <span className="text-indigo-300">{data.language}</span>
                </p>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={copyText}
                  className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600
                             text-xs font-medium text-gray-300 transition"
                >
                  {copied ? '✓ Copied' : 'Copy text'}
                </button>
                <button
                  onClick={downloadTxt}
                  className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600
                             text-xs font-medium text-gray-300 transition"
                >
                  ⬇ .txt
                </button>
              </div>
            </div>

            {/* Search within transcript */}
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setActive(null) }}
              placeholder="Search within transcript…"
              className="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-sm
                         text-white placeholder:text-gray-500 focus:outline-none focus:ring-2
                         focus:ring-indigo-500 transition"
            />

            {/* Search result count */}
            {search && (
              <p className="text-xs text-gray-500">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
              </p>
            )}

            {/* Segment list */}
            <div
              ref={listRef}
              className="rounded-xl bg-gray-950 border border-gray-800 overflow-y-auto"
              style={{ maxHeight: '360px' }}
            >
              {filtered.length === 0 ? (
                <p className="text-xs text-gray-500 p-4 text-center">No segments match.</p>
              ) : (
                filtered.map((seg, i) => (
                  <SegmentRow
                    key={i}
                    seg={seg}
                    index={i}
                    highlight={search}
                    active={active === i}
                    onClick={() => setActive(active === i ? null : i)}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>

    { results && 
    <div>
      {results.raw.length === 0 ? (
      <p>No streaming raw dats</p>
      ):(
      <div>
      <JsonViewer data={results.raw.formats} />
        </div>
      )
      }
    </div>
    
    }
  )
}

// ── SegmentRow ────────────────────────────────────────────────────────────────

function SegmentRow({
  seg,
  index,
  highlight,
  active,
  onClick,
}: {
  seg:       TranscriptSegment
  index:     number
  highlight: string
  active:    boolean
  onClick:   () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex gap-3 px-4 py-2.5 transition border-b border-gray-900
                  last:border-0 hover:bg-gray-800/60
                  ${active ? 'bg-indigo-950/50 border-l-2 border-l-indigo-500' : ''}`}
    >
      {/* Timestamp */}
      <span className="text-xs font-mono text-indigo-400 flex-shrink-0 pt-0.5 w-16">
        {fmtTime(seg.start)}
      </span>

      {/* Caption text with optional highlight */}
      <span className="text-xs text-gray-300 leading-relaxed">
        {highlight ? highlightText(seg.text, highlight) : seg.text}
      </span>
    </button>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format seconds → MM:SS or H:MM:SS */
function fmtTime(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Split text by highlight query and wrap matches in a yellow span.
 * Uses a simple case-insensitive split — no regex injection risk because
 * we're not using the term as a RegExp.
 */
function highlightText(text: string, term: string): React.ReactNode {
  if (!term) return text
  const lower = text.toLowerCase()
  const idx   = lower.indexOf(term.toLowerCase())
  if (idx === -1) return text

  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-400/30 text-yellow-300 rounded px-0.5">
        {text.slice(idx, idx + term.length)}
      </mark>
      {text.slice(idx + term.length)}
    </>
  )
}

function Spin() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white
                     rounded-full animate-spin" />
  )
}

function JsonViewer({ data }) {
  return (
    <details open>
      <summary>Streaming Formats</summary>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}
