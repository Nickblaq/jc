
import { Innertube } from 'youtubei.js'

let _client: Innertube | null = null

export async function getClient(): Promise<Innertube> {
  if (!_client) {
    _client = await Innertube.create({ generate_session_locally: true })
  }
  return _client
}

export function getBestThumb(thumbs: any): string {
  if (!thumbs) return ''
  const arr = Array.isArray(thumbs) ? thumbs : [thumbs]
  return arr.filter(Boolean).sort((a: any, b: any) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? ''
}
