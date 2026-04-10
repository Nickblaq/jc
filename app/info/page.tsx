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
  url?: string
}

export interface StreamResponse {
  title: string
  raw: StreamFormat[]
  adaptive: StreamFormat[]
  chosenFormat: StreamFormat | null
  signedUrl: string | null
}

export default function Info() {
  const [id, setId] = useState('dQw4w9WgXcQ') 
  // dQw4w9WgXcQvalid test ID
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<StreamResponse | null>(null)

  const fetchStreams = async () => {
    setError(null)

    try {
      const res = await fetch(`/api/info?id=${id}`)
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? `Error ${res.status}`)
        setData(null)
      } else {
        setData(json)
        setError(null)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Network error')
      setData(null)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-800 min-h-full w-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-800">
        <span className="text-indigo-400 text-lg">📝</span>
        <h2 className="text-sm font-semibold text-gray-300">Stream Inspector</h2>
      </div>

    
        <input
          value={id}
          onChange={e => setId(e.target.value)}
          placeholder="Video ID"
          className="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-sm
                     text-white placeholder:text-gray-500 focus:outline-none focus:ring-2
                     focus:ring-indigo-500 transition"
        />

        <button
          onClick={fetchStreams}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500
                     disabled:opacity-40 disabled:cursor-not-allowed text-sm
                     font-semibold text-white transition"
        >
          Fetch
        </button>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-950 border border-red-800 p-3">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        {/* Data */}
        {data && (
          <div className="space-y-6">

            {/* Title */}
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white truncate">
                {data.title}
              </h3>
              <p className='text-xl font-bold text-white'>Stream URL{data.signedUrl || 'No Signed Url'}</p>
            </div>

            {/* Chosen Format */}
            <section>
              <h3 className="text-lg text-white mb-2">Chosen Format</h3>
              {data.chosenFormat ? (
                <FormatCard f={data.chosenFormat} highlight />
              ) : (
                <p className="text-white text-lg">No format selected</p>
              )}
            </section>

            {/* Raw Formats */}
            <section>
              <h3 className="text-xl text-white mb-2">
                Raw Formats ({data.raw.length})
              </h3>
              <div className="grid gap-2">
                {data.raw.map((f, i) => (
                  <FormatCard key={i} f={f} />
                ))}
              </div>
            </section>

            {/* Adaptive Formats */}
            <section>
              <h3 className="text-xl text-white mb-2">
                Adaptive Formats ({data.adaptive.length})
              </h3>
              <div className="grid gap-2">
                {data.adaptive.map((f, i) => (
                  <FormatCard key={i} f={f} />
                ))}
              </div>
            </section>

          </div>
        )}
      
    </div>
  )
}

function FormatCard({
  f,
  highlight
}: {
  f: StreamFormat
  highlight?: boolean
}) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 8,
        border: `1px solid ${highlight ? 'red' : '#010101'}`,
        background: '#0f0f0f'
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <strong className='text-white font-bold text-xl'>itag {f.itag}</strong>
        <p className='text-white font-bold text-xl'>{f.quality_label || '—'}</p>
      </div>

      {/* Details */}
      <div style={{ fontSize: 13, marginTop: 6 }}>
        <div className='text-white font-bold text-xl'><b>Type:</b> {f.mime_type}</div>
        <div className='text-white font-bold text-xl'><b>Bitrate:</b> {f.bitrate}</div>

        <div>
          <b>Tracks:</b>
          {f.has_video ? ' 🎥' : ''}
          {f.has_audio ? ' 🔊' : ''}
        </div>

        {f.width && f.height && (
          <div className='text-white font-bold text-xl'><b>Resolution:</b> {f.width}x{f.height}</div>
        )}
        {f.url && (
          <p className='text-white text-sm truncate'>LINK: -{f.url}</p>
        )}
        
      </div>
    </div>
  )
}
