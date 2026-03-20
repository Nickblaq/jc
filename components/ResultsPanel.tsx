
'use client'

import { AgentOutput } from '@/types'

interface Props {
  result: AgentOutput
}

export default function ResultsPanel({ result }: Props) {
  const copy = (text: string) => navigator.clipboard.writeText(text)

  return (
    <div className="space-y-6 text-sm">
      {/* SEO Score */}
      <div className="flex items-center gap-4">
        <div className="text-4xl font-bold text-red-500">{result.seoScore}</div>
        <div>
          <div className="text-white font-medium">SEO Opportunity Score</div>
          <div className="text-gray-400">Search demand vs competition</div>
        </div>
      </div>

      {/* Titles */}
      <Section title="Title Variations">
        {result.titles.map((t, i) => (
          <CopyRow key={i} text={t} onCopy={() => copy(t)} />
        ))}
      </Section>

      {/* Hooks */}
      <Section title="Video Hooks (First 30s)">
        {result.hooks.map((h, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-3 text-gray-300">
            <span className="text-red-400 font-medium mr-2">#{i + 1}</span>
            {h}
          </div>
        ))}
      </Section>

      {/* Thumbnail Copy */}
      <Section title="Thumbnail Copy">
        {result.thumbnailCopy.map((t, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-3">
            <div className="text-white font-bold text-base">{t.primary}</div>
            <div className="text-gray-400">{t.secondary}</div>
          </div>
        ))}
      </Section>

      {/* Description */}
      <Section title="SEO Description">
        <div className="bg-gray-800 rounded-lg p-3 text-gray-300 whitespace-pre-wrap leading-relaxed">
          {result.description}
        </div>
        <button
          onClick={() => copy(result.description)}
          className="mt-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition"
        >
          Copy Description
        </button>
      </Section>

      {/* Tags */}
      <Section title="Tags">
        <div className="flex flex-wrap gap-2">
          {result.tags.map((tag, i) => (
            <span
              key={i}
              onClick={() => copy(tag)}
              className="px-2 py-1 bg-gray-800 text-gray-300 rounded cursor-pointer hover:bg-red-900/40 hover:text-red-300 transition text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      </Section>

      {/* Insights */}
      <Section title="Strategic Insights">
        {result.insights.map((ins, i) => (
          <div key={i} className="flex gap-2 text-gray-300">
            <span className="text-red-500 mt-0.5">→</span>
            <span>{ins}</span>
          </div>
        ))}
      </Section>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="text-gray-400 uppercase tracking-widest text-xs font-semibold mb-3">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function CopyRow({ text, onCopy }: { text: string; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 group">
      <span className="text-gray-200">{text}</span>
      <button
        onClick={onCopy}
        className="ml-3 text-gray-600 group-hover:text-red-400 transition text-xs shrink-0"
      >
        copy
      </button>
    </div>
  )
}
