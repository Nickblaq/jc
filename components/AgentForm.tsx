'use client'

import { useState } from 'react'
import { AgentInput, AgentOutput } from '@/types'

type Mode = 'hosted' | 'api-key'

interface Props {
  onResult: (result: AgentOutput) => void
  onLoading: (loading: boolean) => void
}

export default function AgentForm({ onResult, onLoading }: Props) {
  const [form, setForm] = useState<AgentInput>({
    topic: '',
    niche: '',
    targetAudience: '',
  })
  const [mode, setMode] = useState<Mode>('hosted')

  const handleSubmit = async () => {
    if (!form.topic || !form.niche || !form.targetAudience) return
    onLoading(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, mode }),
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
      {/* Mode Toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Mode
        </label>
        <div className="flex rounded-lg overflow-hidden border border-gray-700">
          {(['hosted', 'api-key'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 text-sm font-medium transition ${
                mode === m
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {m === 'hosted' ? '☁️ Hosted (no key)' : '🔑 API Key'}
            </button>
          ))}
        </div>
        <p className="text-gray-600 text-xs mt-1">
          {mode === 'hosted'
            ? 'Runs inside Claude.ai — no key needed'
            : 'Uses ANTHROPIC_API_KEY from .env.local'}
        </p>
      </div>

      {/* Form Fields */}
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
          placeholder="e.g. AI development, autonomous systems"
          value={form.channelNiche}
          onChange={(e) => setForm({ ...form, niche: e.target.value })}
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
