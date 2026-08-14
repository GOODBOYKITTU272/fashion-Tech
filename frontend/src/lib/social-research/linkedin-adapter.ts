import { evaluateResearchRelevance } from '../relevance-gate'
import { CanonicalResearchSignal, fetchJinaWebReader, generateFingerprint } from '../agent-reach-adapter'
import { getSupabaseAdmin } from '../supabase-admin'

export interface LinkedInResearchResult {
  platform: 'LinkedIn'
  status: 'ACTIVE' | 'PUBLIC_CLOUD' | 'AUTH_REQUIRED' | 'FAILED'
  signals_discovered: number
  signals_accepted: number
  signals_rejected: number
  signals_deduplicated: number
  signals: CanonicalResearchSignal[]
  error?: string
}

const PUBLIC_LINKEDIN_TARGETS = [
  { name: 'Vogue Business LinkedIn', url: 'https://www.linkedin.com/company/vogue-business' },
  { name: 'FashionTech Accelerator', url: 'https://www.linkedin.com/company/fashion-technology-accelerator' }
]

export async function runLinkedInResearchAutomation(userId: string): Promise<LinkedInResearchResult> {
  const linkedinCookie = process.env.LINKEDIN_AUTH_COOKIE || process.env.LI_AT_COOKIE

  const isAuthAvailable = !!(linkedinCookie && !linkedinCookie.startsWith('your-'))
  const acceptedSignals: CanonicalResearchSignal[] = []
  let discoveredCount = 0
  let acceptedCount = 0
  let rejectedCount = 0
  let deduplicatedCount = 0

  const admin = getSupabaseAdmin()

  for (const target of PUBLIC_LINKEDIN_TARGETS) {
    try {
      const jinaData = await fetchJinaWebReader(target.url)
      if (!jinaData || !jinaData.content) continue

      discoveredCount++

      const title = jinaData.title || target.name
      const fingerprint = generateFingerprint(target.url, title)

      // Deduplication Check
      const { data: existing } = await admin
        .from('research_signals')
        .select('id')
        .or(`url.eq.${target.url},fingerprint.eq.${fingerprint}`)
        .limit(1)

      if (existing && existing.length > 0) {
        deduplicatedCount++
        continue
      }

      const relevanceResult = await evaluateResearchRelevance(title, jinaData.content.substring(0, 400), jinaData.content)

      if (relevanceResult.eligible) {
        acceptedCount++
      } else {
        rejectedCount++
      }

      const signal: CanonicalResearchSignal = {
        source_name: target.name,
        source_url: target.url,
        title,
        summary: jinaData.content.substring(0, 300),
        published_at: null,
        discovered_at: new Date().toISOString(),
        category: 'Public LinkedIn Research',
        raw_text: jinaData.content,
        source_type: 'web_scrape',
        platform: 'LinkedIn',
        query_used: target.name,
        runtime: isAuthAvailable ? 'local' : 'cloud',
        agent_reach_used: false,
        trust_score: 85,
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
    } catch (err) {
      console.error(`LinkedIn research error for ${target.name}:`, err)
    }
  }

  return {
    platform: 'LinkedIn',
    status: isAuthAvailable ? 'ACTIVE' : 'PUBLIC_CLOUD',
    signals_discovered: discoveredCount,
    signals_accepted: acceptedCount,
    signals_rejected: rejectedCount,
    signals_deduplicated: deduplicatedCount,
    signals: acceptedSignals
  }
}
