
export interface AgentInput {
  topic: string
  channelNiche: string
  targetAudience: string
}

export interface AgentOutput {
  titles: string[]
  description: string
  tags: string[]
  hooks: string[]
  thumbnailCopy: { primary: string; secondary: string }[]
  seoScore: number
  insights: string[]
}
