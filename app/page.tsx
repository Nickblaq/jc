'use client'

import { useState } from 'react'
import AgentForm from '@/components/AgentForm'
import ResultsPanel from '@/components/ResultsPanel'
import { AgentOutput } from '@/types'

export default function Home() {
  const [result, setResult] = useState<AgentOutput | null>(null)
  const [loading, setLoading] = useState(false)

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-8 bg-red-600 rounded-full" />
            <h1 className="text-2xl font-bold tracking-tight">
              YouTube Growth Agent
            </h1>
          </div>
          <p className="text-gray-500 ml-5">
            AI-powered SEO, titles, hooks, and strategy — in one shot.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h2 className="text-gray-300 font-semibold mb-5">Video Details</h2>
            <AgentForm onResult={setResult} onLoading={setLoading} />
          </div>

          {/* Output */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 min-h-[400px]">
            {loading && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
                <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Agent is analyzing...</span>
              </div>
            )}
            {!loading && !result && (
              <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                Results will appear here
              </div>
            )}
            {!loading && result && <ResultsPanel result={result} />}
          </div>
        </div>
      </div>
    </main>
  )
}
