import { evaluateResearchRelevance } from '../relevance-gate'
import { CanonicalResearchSignal, generateFingerprint, parsePublishedAt } from '../agent-reach-adapter'
import { getSupabaseAdmin } from '../supabase-admin'

export interface RedditResearchResult {
  platform: 'Reddit'
  status: 'ACTIVE' | 'AUTH_REQUIRED' | 'FAILED'
  signals_discovered: number
  signals_accepted: number
  signals_rejected: number
  signals_deduplicated: number
  signals: CanonicalResearchSignal[]
  error?: string
}

const TARGET_SUBREDDITS = [
  'FashionDesign',
  'CLO3D',
  'Textiles',
  'SustainableFashion',
  'PatternMaking'
]

export async function runRedditResearchAutomation(userId: string): Promise<RedditResearchResult> {
  const acceptedSignals: CanonicalResearchSignal[] = []
  let discoveredCount = 0
  let acceptedCount = 0
  let rejectedCount = 0
  let deduplicatedCount = 0

  const admin = getSupabaseAdmin()

  for (const sub of TARGET_SUBREDDITS) {
    try {
      const url = `https://www.reddit.com/r/${sub}/hot.json?limit=3`
      const res = await fetch(url, { headers: { 'User-Agent': 'FashionTech-Bot/1.5' } })

      if (!res.ok) continue

      const data = await res.json()
      const posts = data.data?.children || []

      for (const item of posts) {
        const post = item.data
        if (!post || !post.title || post.stickied) continue

        discoveredCount++

        const title = post.title
        const postUrl = `https://www.reddit.com${post.permalink}`
        const selftext = post.selftext || ''
        const publishedAt = parsePublishedAt(post.created_utc ? new Date(post.created_utc * 1000).toISOString() : null)
        const fingerprint = generateFingerprint(postUrl, title)

        // Deduplication Check
        const { data: existing } = await admin
          .from('research_signals')
          .select('id')
          .or(`url.eq.${postUrl},fingerprint.eq.${fingerprint}`)
          .limit(1)

        if (existing && existing.length > 0) {
          deduplicatedCount++
          continue
        }

        // Fashion Relevance Gate Check
        const relevanceResult = await evaluateResearchRelevance(title, selftext.substring(0, 400), selftext)

        if (relevanceResult.eligible) {
          acceptedCount++
        } else {
          rejectedCount++
        }

        const signal: CanonicalResearchSignal = {
          source_name: `r/${sub}`,
          source_url: postUrl,
          title,
          summary: selftext.substring(0, 300) || title,
          published_at: publishedAt,
          discovered_at: new Date().toISOString(),
          category: 'Reddit Community Research',
          raw_text: selftext,
          source_type: 'web_scrape',
          platform: 'Reddit',
          query_used: `r/${sub}`,
          runtime: 'cloud',
          agent_reach_used: false,
          trust_score: 75,
          relevance_status: relevanceResult.relevance_status,
          relevance_score: relevanceResult.relevance_score,
          topic_family: relevanceResult.topic_family,
          relevance_reason: relevanceResult.relevance_reason
        }

        if (userId) {
          await admin.from('research_signals').insert({
            source_name: signal.source_name,
            source_type: signal.source_type,
            platform: signal.platform,
            query_used: signal.query_used,
            runtime: signal.runtime,
            agent_reach_used: signal.agent_reach_used,
            trust_score: signal.trust_score,
            url: signal.source_url,
            title: signal.title,
            summary: signal.summary,
            raw_content: signal.raw_text,
            category: signal.category,
            published_at: signal.published_at,
            captured_at: signal.discovered_at,
            fingerprint,
            relevance_status: relevanceResult.relevance_status,
            relevance_score: relevanceResult.relevance_score,
            topic_family: relevanceResult.topic_family,
            relevance_reason: relevanceResult.relevance_reason,
            relevance_checked_at: new Date().toISOString(),
            processed: !relevanceResult.eligible
          })
        }

        if (relevanceResult.eligible) {
          acceptedSignals.push(signal)
        }
      }
    } catch (err) {
      console.error(`Reddit research error for r/${sub}:`, err)
    }
  }

  return {
    platform: 'Reddit',
    status: 'ACTIVE',
    signals_discovered: discoveredCount,
    signals_accepted: acceptedCount,
    signals_rejected: rejectedCount,
    signals_deduplicated: deduplicatedCount,
    signals: acceptedSignals
  }
}
