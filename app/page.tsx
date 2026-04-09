
import ChannelPage from '@/components/ChannelPage'
import StreamPanel from '@/components/StreamPanel'
import LivePage from '@/components/LivePage'

export default function Home() {
  return (
      <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">YT Manager</h1>
          <p className="text-gray-400 mt-1 text-sm">
            YouTube channel explorer, live capture, Studio management, and stream diagnostics
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
          {/* Left column */}
          <div className="space-y-5">
            <ChannelPage />
            <StreamPanel />
          </div>

          {/* Right column */}
          <div>
            <LivePage />
          </div>
        </div>
      </div>
    </div>
  )
}


{/*
<main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
      
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
          
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h2 className="text-gray-300 font-semibold mb-5">Video Details</h2>
            <AgentForm onResult={setResult} onLoading={setLoading} />
          </div>

          
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
*/}
