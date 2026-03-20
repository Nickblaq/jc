
'use client'

import { useState } from 'react'
import { AgentInput, AgentOutput } from '@/types'

interface Props {
  onResult: (result: AgentOutput) => void
  onLoading: (loading: boolean) => void
}

export default function AgentForm({ onResult, onLoading }: Props) {
  const [form, setForm] = useState<AgentInput>({
    topic: '',
    channelNiche: '',
    targetAudience: '',
  })

  const handleSubmit = async () => {
    if (!form.topic || !form.channelNiche || !form.targetAudience) return
    onLoading(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      onResult(data)
    } catch (e) {
      console.error(e)
    } finally {
      onLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Video Topic
        </label>
        <input
          type="text"
          placeholder="e.g. How I built an autonomous AI agent in TypeScript"
          value={form.topic}
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
          className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Channel Niche
        </label>
        <input
          type="text"
          placeholder="e.g. AI development, autonomous systems, R&D"
          value={form.channelNiche}
          onChange={(e) => setForm({ ...form, channelNiche: e.target.value })}
          className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Target Audience
        </label>
        <input
          type="text"
          placeholder="e.g. senior engineers, founders, AI researchers"
          value={form.targetAudience}
          onChange={(e) =>
            setForm({ ...form, targetAudience: e.target.value })
          }
          className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition"
        />
      </div>

      <button
        onClick={handleSubmit}
        className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition"
      >
        Run Agent
      </button>
    </div>
  )
}
