
'use client'

import { useState, useRef } from 'react'
import ShortList from './ShortList'
import { ShortItem } from '@/types'

// ─── Rank medal colours ───────────────────────────────────────────────────────
const RANK = ['#FFD700', '#C0C0C0', '#CD7F32', '#888', '#666']
const RANK_LABELS = ['#1', '#2', '#3', '#4', '#5']


 export default function ShortCard() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<ShortItem[] | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

     const search = async () => {
    const id = query.trim()
    if (!id || status === 'loading') return

    setStatus('loading')
    setResult(null)
    setError('')

    try {
      const res = await fetch(`/api/shorts?id=${encodeURIComponent(id)}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      setResult(data.shorts as shortItem[])
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
       <div>Short Page</div>
     </>
   )
 }
