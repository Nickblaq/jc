
'use client'

import { useState } from 'react'

// types/stream.ts

export interface StreamFormat {
  itag: number
  mime_type: string
  bitrate: number
  quality_label?: string
  has_video: boolean
  has_audio: boolean
  width?: number
  height?: number
}

export interface StreamResponse {
  title: string
  raw: StreamFormat[]
  adaptive: StreamFormat[]
  chosenFormat: StreamFormat | null
  signedUrl: string | null
}

export default function Info() {
  const [id, setId] = useState('')
  const [error,   setError]   = useState<string | null>(null)
  const [data, setData] = useState<StreamResponse | null>(null)

  const fetchStreams = async () => {
    const res = await fetch(`/api/info?id=${id}`)
    
    const json = await res.json()
    setData(json)

    try {
      const res  = await fetch(`/api/info?id=${id}`)
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? `Error ${res.status}`)
      } else {
        setData(json)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Network error')
    } finally {
      
    }
  }

  return (
     <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-800">
        <span className="text-indigo-400 text-lg">📝</span>
        <h2 className="text-sm font-semibold text-gray-300">Transcript Fetcher</h2>
      </div>

    <div className="p-5 space-y-4" style={{ padding: 20 }}>
      <input
        value={id}
        onChange={e => setId(e.target.value)}
        placeholder="Video ID"
        className="flex-1 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-sm
                       text-white placeholder:text-gray-500 focus:outline-none focus:ring-2
                       focus:ring-indigo-500 transition"
      />
      <button 
        onClick={fetchStreams}
        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500
                       disabled:opacity-40 disabled:cursor-not-allowed text-sm
                       font-semibold text-white transition whitespace-nowrap"
        >
        Fetch</button>

      {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-950 border border-red-800 p-3">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}
      
      {data && (
        <div className='space-y-5 min-h-full padding-8'>
          <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white truncate" >{data.title}</h3>
          <p className="text-lg font-semibold text-red truncate"><b>Signed URL:</b></p>
          <code className="text-lg font-semibold text-red truncate" style={{ wordBreak: 'break-all' }}>
            {data.signedUrl || 'null'}
          </code>

           <section>
            <h3>Adaptive Formats ({data.adaptive.length})</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {data.adaptive.map((f, i) => (
                <FormatCard key={i} f={f} />
              ))}
            </div>
          </section>
        </div>
        </div>
      )}
     </div>
     </div>
  )
       function FormatCard({ f, highlight }: { f: StreamFormat, highlight?: boolean }) {
  return (
    <div style={{
      padding: 12,
      borderRadius: 8,
      border: `1px solid ${highlight ? 'red' : '#333'}`,
      background: '#0f0f0f'
    }}>
      
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <strong>itag {f.itag}</strong>
        <span>{f.quality_label || '—'}</span>
      </div>

      {/* Details */}
      <div style={{ fontSize: 13, marginTop: 6 }}>
        <div><b>Type:</b> {f.mime_type}</div>
        <div><b>Bitrate:</b> {f.bitrate}</div>

        <div>
          <b>Tracks:</b> 
          {f.has_video ? ' 🎥' : ''} 
          {f.has_audio ? ' 🔊' : ''}
        </div>

        {f.width && f.height && (
          <div><b>Resolution:</b> {f.width}x{f.height}</div>
        )}
      </div>
    </div>
  )
}
}


