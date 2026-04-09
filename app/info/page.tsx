
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
    <div className='min-h-100' style={{ padding: 20 }}>
      <input
        value={id}
        onChange={e => setId(e.target.value)}
        placeholder="Video ID"
      />
      <button onClick={fetchStreams}>Fetch</button>

      {data && (
        <>
          <h3>{data.title}</h3>

          <p><b>Signed URL:</b></p>
          <code style={{ wordBreak: 'break-all' }}>
            {data.signedUrl || 'null'}
          </code>

          <h4>Chosen Format</h4>
          <pre>{JSON.stringify(data.chosenFormat, null, 2)}</pre>

          <h4>Raw Formats</h4>
          <pre>{JSON.stringify(data.raw, null, 2)}</pre>

          <h4>Adaptive Formats</h4>
          <pre>{JSON.stringify(data.adaptive, null, 2)}</pre>
        </>
      )}
    </div>
  )
}
