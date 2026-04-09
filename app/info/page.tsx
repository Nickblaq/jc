
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
  const [data, setData] = useState<StreamResponse | null>(null)

  const fetchStreams = async () => {
    const res = await fetch(`/api/info?id=${id}`)
    const json = await res.json()
    setData(json)
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

      {data && (
        <div className='space-y-5'>
          <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xl font-bold text-white truncate" >{data.title}</h3>
          <p className="text-lg font-semibold text-red truncate"><b>Signed URL:</b></p>
          <code className="text-lg font-semibold text-red truncate" style={{ wordBreak: 'break-all' }}>
            {data.signedUrl || 'null'}
          </code>

          <h4 className="text-xl font-bold text-white">Chosen Format</h4>
          <pre className="text-lg font-semibold text-red truncate">{JSON.stringify(data.chosenFormat, null, 2)}</pre>

          <h4 className="text-xl font-bold text-white">Raw Formats</h4>
          <pre className="text-lg font-semibold text-red truncate">{JSON.stringify(data.raw, null, 2)}</pre>

          <h4 className="text-xl font-bold text-white">Adaptive Formats</h4>
          <pre className="text-lg font-bold text-red">{JSON.stringify(data.adaptive, null, 2)}</pre>
        </div>
        </div>
      )}
     </div>
     </div>
  )
       
}
