import { getSupabaseAdmin } from './supabase-admin'
import crypto from 'crypto'
import { evaluateResearchRelevance } from './relevance-gate'

export interface CanonicalResearchSignal {
  source_name: string
  source_url: string
  title: string
  summary: string | null
  published_at: string | null
  discovered_at: string
  category: string
  raw_text: string | null
  source_type: 'rss' | 'web_search' | 'web_scrape'
  relevance_status?: 'accepted' | 'rejected' | 'failed'
  relevance_score?: number
  topic_family?: string
  relevance_reason?: string
}

export interface IngestionResult {
  success: boolean
  ingestion_status: string
  runtime: 'SAFE_HTTP_CONNECTORS'
  agent_reach_local_status: 'READY'
  agent_reach_production_status: 'NOT_DEPLOYED'
  signals_discovered: number
  signals_inserted: number
  signals_accepted: number
  signals_rejected: number
  signals_deduplicated: number
  signals: CanonicalResearchSignal[]
  errors: string[]
}

// Production Feeds for Fashion Tech, Indian Textiles, Craftsmanship, and Sustainable Fashion
const SAFE_FASHION_RSS_FEEDS = [
  {
    name: 'FashionUnited Global',
    url: 'https://fashionunited.com/rss-news',
    category: 'Contemporary & Sustainable Fashion'
  },
  {
    name: 'Textile Today Global',
    url: 'https://www.textiletoday.com.bd/feed/',
    category: 'Textile Innovation & Craftsmanship'
  },
  {
    name: 'Fibre2Fashion News',
    url: 'https://www.fibre2fashion.com/rss/news/fashion-news.xml',
    category: 'Textile & Apparel Industry'
  },
  {
    name: 'Apparel Resources Tech',
    url: 'https://apparelresources.com/feed/',
    category: 'Fashion Technology & Supply Chain'
  }
]

export function parsePublishedAt(rawDate?: string | null): string | null {
  if (!rawDate || typeof rawDate !== 'string') return null
  const cleaned = rawDate.replace(/<[^>]+>/g, '').trim()
  if (!cleaned) return null

  try {
    const d = new Date(cleaned)
    if (isNaN(d.getTime())) return null
    return d.toISOString()
  } catch {
    return null
  }
}

export function generateFingerprint(sourceUrl: string, title: string): string {
  const normalizedUrl = sourceUrl.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
  const normalizedTitle = title.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  return crypto.createHash('sha256').update(`${normalizedUrl}:${normalizedTitle}`).digest('hex')
}

export async function fetchJinaWebReader(targetUrl: string): Promise<{ title: string; content: string } | null> {
  try {
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(targetUrl)}`
    const res = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain'
      }
    })

    if (!res.ok) return null

    const text = await res.text()
    if (!text || text.length < 50 || text.includes('AbuseAlleviationError')) return null

    const lines = text.split('\n').filter(l => l.trim().length > 0)
    const title = lines[0]?.replace(/^Title:\s*/i, '').trim() || 'Scraped Article'

    return {
      title,
      content: text.substring(0, 3000)
    }
  } catch (err) {
    console.error('Jina Web Reader fetch failed:', err)
    return null
  }
}

/**
 * runAgentReachW1Ingestion
 * Master W1 ingestion workflow using safe HTTP RSS connectors & Jina Web Reader enrichment.
 * Evaluates fashion relevance gate before DB insertion.
 */
export async function runAgentReachW1Ingestion(userId: string): Promise<IngestionResult> {
  const resultSignals: CanonicalResearchSignal[] = []
  const errors: string[] = []
  let discoveredCount = 0
  let insertedCount = 0
  let acceptedCount = 0
  let rejectedCount = 0
  let deduplicatedCount = 0

  if (!userId) {
    return {
      success: false,
      ingestion_status: 'BLOCKED',
      runtime: 'SAFE_HTTP_CONNECTORS',
      agent_reach_local_status: 'READY',
      agent_reach_production_status: 'NOT_DEPLOYED',
      signals_discovered: 0,
      signals_inserted: 0,
      signals_accepted: 0,
      signals_rejected: 0,
      signals_deduplicated: 0,
      signals: [],
      errors: ['User ID is required for research signal ingestion.']
    }
  }

  const admin = getSupabaseAdmin()

  for (const feed of SAFE_FASHION_RSS_FEEDS) {
    try {
      const res = await fetch(feed.url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } })
      if (!res.ok) {
        errors.push(`Failed to fetch RSS feed ${feed.name}: HTTP ${res.status}`)
        continue
      }

      const xmlText = await res.text()
      const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/gi) || []
      const itemsToProcess = itemMatches.slice(0, 4)

      for (const itemXml of itemsToProcess) {
        const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)
        const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)
        const pubDateMatch = itemXml.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i)
        const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)

        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : null
        const link = linkMatch ? linkMatch[1].trim() : null

        if (!title || !link) continue

        discoveredCount++

        const summary = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').substring(0, 400).trim() : null
        const publishedAt = parsePublishedAt(pubDateMatch ? pubDateMatch[1] : null)
        const discoveredAt = new Date().toISOString()
        const fingerprint = generateFingerprint(link, title)

        // Deduplication Check
        const { data: existing } = await admin
          .from('research_signals')
          .select('id')
          .or(`url.eq.${link},fingerprint.eq.${fingerprint}`)
          .limit(1)

        if (existing && existing.length > 0) {
          deduplicatedCount++
          continue
        }

        // Attempt Jina enrichment if available
        let enrichedContent = summary
        const jinaData = await fetchJinaWebReader(link)
        if (jinaData && jinaData.content) {
          enrichedContent = `${summary || ''}\n\n${jinaData.content}`.trim()
        }

        // 4. Run Fashion Relevance Gate Check
        const relevanceResult = await evaluateResearchRelevance(title, summary || '', enrichedContent || '')

        if (relevanceResult.eligible) {
          acceptedCount++
        } else {
          rejectedCount++
        }

        const signal: CanonicalResearchSignal = {
          source_name: feed.name,
          source_url: link,
          title,
          summary,
          published_at: publishedAt,
          discovered_at: discoveredAt,
          category: feed.category,
          raw_text: enrichedContent,
          source_type: 'rss',
          relevance_status: relevanceResult.relevance_status,
          relevance_score: relevanceResult.relevance_score,
          topic_family: relevanceResult.topic_family,
          relevance_reason: relevanceResult.relevance_reason
        }

        // Insert persistent signal into public.research_signals
        // If rejected by relevance gate, set processed = true so it never enters W2
        const { error: insertErr } = await admin.from('research_signals').insert({
          source_name: signal.source_name,
          source_type: signal.source_type,
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

        if (insertErr) {
          if (insertErr.code === '23505') {
            deduplicatedCount++
          } else {
            console.error(`Failed to insert signal ${title}:`, insertErr)
            errors.push(`Database insert failed for ${title}: ${insertErr.message}`)
          }
        } else {
          insertedCount++
          resultSignals.push(signal)
        }
      }
    } catch (err: any) {
      errors.push(`Error processing feed ${feed.name}: ${err.message}`)
    }
  }

  return {
    success: errors.length === 0 || insertedCount > 0 || deduplicatedCount > 0,
    ingestion_status: 'READY',
    runtime: 'SAFE_HTTP_CONNECTORS',
    agent_reach_local_status: 'READY',
    agent_reach_production_status: 'NOT_DEPLOYED',
    signals_discovered: discoveredCount,
    signals_inserted: insertedCount,
    signals_accepted: acceptedCount,
    signals_rejected: rejectedCount,
    signals_deduplicated: deduplicatedCount,
    signals: resultSignals,
    errors
  }
}
