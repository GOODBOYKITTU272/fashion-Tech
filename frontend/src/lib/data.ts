import { supabase } from '@/lib/supabase'

export type TopicOpportunity = {
  cluster_id: string
  cluster_title: string
  summary: string | null
  scored_at: string
  freshness_score: number
  source_trust_score: number
  us_relevance_score: number
  uk_relevance_score: number
  pranavi_alignment_score: number
  total_opportunity_score: number
  scored_by_model: string | null
  source_name: string | null
  source_url: string | null
  category: string | null
}

export async function getTopOpportunities(): Promise<TopicOpportunity[]> {
  // Get today's top 5 scored topics
  const since = new Date()
  since.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('topic_scores')
    .select(`
      cluster_id,
      freshness_score,
      source_trust_score,
      us_relevance_score,
      uk_relevance_score,
      pranavi_alignment_score,
      total_opportunity_score,
      scored_by_model,
      scored_at,
      topic_clusters (
        cluster_title,
        summary,
        research_signals (
          category,
          sources ( name, url )
        )
      )
    `)
    .gte('scored_at', since.toISOString())
    .order('total_opportunity_score', { ascending: false })
    .limit(5)

  if (error || !data) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((row: any) => {
    const cluster = row.topic_clusters
    const signal = cluster?.research_signals?.[0]
    const source = signal?.sources
    return {
      cluster_id: row.cluster_id,
      cluster_title: cluster?.cluster_title ?? 'Untitled Topic',
      summary: cluster?.summary ?? null,
      scored_at: row.scored_at,
      freshness_score: row.freshness_score,
      source_trust_score: row.source_trust_score,
      us_relevance_score: row.us_relevance_score,
      uk_relevance_score: row.uk_relevance_score,
      pranavi_alignment_score: row.pranavi_alignment_score,
      total_opportunity_score: row.total_opportunity_score,
      scored_by_model: row.scored_by_model,
      source_name: source?.name ?? null,
      source_url: source?.url ?? null,
      category: signal?.category ?? null,
    }
  })
}
