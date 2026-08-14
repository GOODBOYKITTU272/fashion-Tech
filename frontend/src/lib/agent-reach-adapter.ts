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
  platform: string
  query_used?: string
  runtime: 'cloud' | 'local'
  agent_reach_used: boolean
  trust_score: number
  relevance_status?: 'accepted' | 'rejected' | 'failed'
  relevance_score?: number
  positioning_fit_score?: number
  why_it_matters_to_pranavi?: string | null
  topic_family?: string
  relevance_reason?: string
  research_run_id?: string
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

const SAFE_FASHION_RSS_FEEDS = [
  {
    name: 'FashionUnited Global',
    url: 'https://fashionunited.com/rss-news',
    category: 'Contemporary & Sustainable Fashion',
    clusterId: 'CONTEMPORARY_DESIGN'
  },
  {
    name: 'Textile Today Global',
    url: 'https://www.textiletoday.com.bd/feed/',
    category: 'Textile Innovation & Craftsmanship',
    clusterId: 'TEXTILES'
  },
  {
    name: 'Fibre2Fashion News',
    url: 'https://www.fibre2fashion.com/rss/news/fashion-news.xml',
    category: 'Textile & Apparel Industry',
    clusterId: 'INDIAN_CRAFT'
  },
  {
    name: 'Apparel Resources Tech',
    url: 'https://apparelresources.com/feed/',
    category: 'Fashion Technology & Supply Chain',
    clusterId: 'FASHION_TECH'
  }
]

const SUBREDDITS = ['FashionDesign', 'CLO3D', 'Textiles', 'SustainableFashion', 'PatternMaking']

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
 * Master background research worker. Automatically scans RSS, Reddit, LinkedIn Public, and X.
 */
export async function runAgentReachW1Ingestion(userId: string): Promise<IngestionResult> {
  const resultSignals: CanonicalResearchSignal[] = []
  const errors: string[] = []
  const researchRunId = crypto.randomUUID()
  
  let discoveredCount = 0
  let insertedCount = 0
  let acceptedCount = 0
  let rejectedCount = 0
  let deduplicatedCount = 0

  const sourceStatuses: Record<string, any> = {
    rss: { status: 'configured', transport: 'RSS_HTTP' },
    reddit: { status: 'configured', transport: 'REDDIT_JSON' },
    linkedin_public: { status: 'configured', transport: 'JINA_SEARCH' },
    twitter_x: { status: 'auth_required', transport: 'TWITTER_API' }
  }

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
  const jinaHeaders: Record<string, string> = {}
  if (process.env.JINA_API_KEY) {
    jinaHeaders['Authorization'] = `Bearer ${process.env.JINA_API_KEY}`
  }

  // ==================================================
  // 1. RSS FEEDS PROCESSOR
  // ==================================================
  let rssSuccessCount = 0
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

      rssSuccessCount++

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
        const fingerprint = generateFingerprint(link, title)

        // Dedupe
        const { data: existing } = await admin
          .from('research_signals')
          .select('id')
          .or(`url.eq.${link},fingerprint.eq.${fingerprint}`)
          .limit(1)

        if (existing && existing.length > 0) {
          deduplicatedCount++
          continue
        }

        const relevanceResult = await evaluateResearchRelevance(title, summary || '')

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
          discovered_at: new Date().toISOString(),
          category: feed.category,
          raw_text: summary,
          source_type: 'rss',
          platform: 'RSS',
          query_used: feed.clusterId,
          runtime: 'cloud',
          agent_reach_used: false,
          trust_score: 85, // Trust Level B
          relevance_status: relevanceResult.relevance_status,
          relevance_score: relevanceResult.relevance_score,
          positioning_fit_score: relevanceResult.positioning_fit_score,
          why_it_matters_to_pranavi: relevanceResult.why_it_matters_to_pranavi,
          topic_family: relevanceResult.topic_family,
          relevance_reason: relevanceResult.relevance_reason,
          research_run_id: researchRunId
        }

        const { error: insertErr } = await admin.from('research_signals').insert({
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
          positioning_fit_score: relevanceResult.positioning_fit_score,
          why_it_matters_to_pranavi: relevanceResult.why_it_matters_to_pranavi,
          topic_family: relevanceResult.topic_family,
          relevance_reason: relevanceResult.relevance_reason,
          relevance_checked_at: new Date().toISOString(),
          processed: !relevanceResult.eligible,
          research_run_id: researchRunId,
          provenance: 'RSS_FEED',
          transport_used: 'RSS_HTTP',
          fallback_used: false
        })

        if (!insertErr) {
          insertedCount++
          resultSignals.push(signal)
        } else if (insertErr.code === '23505') {
          deduplicatedCount++
        }
      }
    } catch (err: any) {
      errors.push(`RSS feed ${feed.name} failed: ${err.message}`)
    }
  }
  sourceStatuses.rss = { status: rssSuccessCount > 0 ? 'active' : 'failed', transport: 'RSS_HTTP' }

  // ==================================================
  // 2. REDDIT SCRAPER WITH JINA FALLBACK
  // ==================================================
  let redditSuccessCount = 0
  let redditFallbackTriggered = false

  for (const sub of SUBREDDITS) {
    try {
      let posts: any[] = []
      let transportUsed: string = 'REDDIT_JSON'
      let fallbackUsed: boolean = false

      const res = await fetch(`https://www.reddit.com/r/${sub}/new.json?limit=5`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })

      if (res.ok) {
        const json = await res.json()
        const rawPosts = json?.data?.children || []
        posts = rawPosts.map((p: any) => ({
          title: p.data.title,
          url: p.data.url || `https://www.reddit.com${p.data.permalink}`,
          summary: p.data.selftext || '',
          publishedAt: new Date(p.data.created_utc * 1000).toISOString()
        }))
      } else {
        // Fallback to Jina Search for Reddit posts in this subreddit
        redditFallbackTriggered = true
        transportUsed = 'JINA_SEARCH'
        fallbackUsed = true

        const jinaRedditUrl = `https://s.jina.ai/${encodeURIComponent(`site:reddit.com/r/${sub}`)}`
        const jinaRes = await fetch(jinaRedditUrl, { headers: jinaHeaders })
        if (jinaRes.ok) {
          const text = await jinaRes.text()
          const matches = text.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g)
          let count = 0
          for (const match of matches) {
            if (count >= 3) break
            const linkTitle = match[1].trim()
            const linkUrl = match[2].trim()
            if (!linkUrl.includes(`reddit.com/r/${sub}`)) continue

            posts.push({
              title: linkTitle,
              url: linkUrl,
              summary: 'Indexed community post from r/' + sub,
              publishedAt: new Date().toISOString()
            })
            count++
          }
        }
      }

      if (posts.length > 0) {
        redditSuccessCount++
      }

      for (const post of posts) {
        discoveredCount++
        const fingerprint = generateFingerprint(post.url, post.title)

        // Dedupe
        const { data: existing } = await admin
          .from('research_signals')
          .select('id')
          .or(`url.eq.${post.url},fingerprint.eq.${fingerprint}`)
          .limit(1)

        if (existing && existing.length > 0) {
          deduplicatedCount++
          continue
        }

        const relevanceResult = await evaluateResearchRelevance(post.title, post.summary)

        if (relevanceResult.eligible) {
          acceptedCount++
        } else {
          rejectedCount++
        }

        const signal: CanonicalResearchSignal = {
          source_name: `r/${sub}`,
          source_url: post.url,
          title: post.title,
          summary: post.summary.substring(0, 400),
          published_at: post.publishedAt,
          discovered_at: new Date().toISOString(),
          category: 'Reddit Community Discussion',
          raw_text: post.summary,
          source_type: 'web_scrape',
          platform: 'Reddit',
          query_used: `r/${sub}`,
          runtime: 'cloud',
          agent_reach_used: false, // Explicitly set false as native Agent Reach CLI was not called
          trust_score: 65, // Trust Level C
          relevance_status: relevanceResult.relevance_status,
          relevance_score: relevanceResult.relevance_score,
          positioning_fit_score: relevanceResult.positioning_fit_score,
          why_it_matters_to_pranavi: relevanceResult.why_it_matters_to_pranavi,
          topic_family: relevanceResult.topic_family,
          relevance_reason: relevanceResult.relevance_reason,
          research_run_id: researchRunId
        }

        const { error: insertErr } = await admin.from('research_signals').insert({
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
          positioning_fit_score: relevanceResult.positioning_fit_score,
          why_it_matters_to_pranavi: relevanceResult.why_it_matters_to_pranavi,
          topic_family: relevanceResult.topic_family,
          relevance_reason: relevanceResult.relevance_reason,
          relevance_checked_at: new Date().toISOString(),
          processed: !relevanceResult.eligible,
          research_run_id: researchRunId,
          provenance: 'REDDIT',
          transport_used: transportUsed,
          fallback_used: fallbackUsed
        })

        if (!insertErr) {
          insertedCount++
          resultSignals.push(signal)
        } else if (insertErr.code === '23505') {
          deduplicatedCount++
        }
      }
    } catch (err: any) {
      errors.push(`Reddit r/${sub} scraper error: ${err.message}`)
    }
  }
  
  sourceStatuses.reddit = {
    status: redditSuccessCount > 0 ? 'active' : 'failed',
    transport: redditFallbackTriggered ? 'JINA_FALLBACK' : 'REDDIT_JSON'
  }

  // ==================================================
  // 3. LINKEDIN PUBLIC SEARCH via Jina Search API
  // ==================================================
  try {
    const jinaSearchUrl = `https://s.jina.ai/${encodeURIComponent('linkedin fashion tech contemporary design indian craft')}`
    const res = await fetch(jinaSearchUrl, { headers: jinaHeaders })
    if (res.ok) {
      const text = await res.text()
      const matches = text.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g)
      let count = 0

      for (const match of matches) {
        if (count >= 5) break
        const linkTitle = match[1].trim()
        const linkUrl = match[2].trim()

        if (!linkUrl.includes('linkedin.com') && !linkUrl.includes('fashion') && !linkUrl.includes('textile')) continue
        discoveredCount++
        count++

        const fingerprint = generateFingerprint(linkUrl, linkTitle)
        
        // Dedupe
        const { data: existing } = await admin
          .from('research_signals')
          .select('id')
          .or(`url.eq.${linkUrl},fingerprint.eq.${fingerprint}`)
          .limit(1)

        if (existing && existing.length > 0) {
          deduplicatedCount++
          continue
        }

        const relevanceResult = await evaluateResearchRelevance(linkTitle, 'Public search index entry.')

        if (relevanceResult.eligible) {
          acceptedCount++
        } else {
          rejectedCount++
        }

        const signal: CanonicalResearchSignal = {
          source_name: 'LinkedIn Public Index',
          source_url: linkUrl,
          title: linkTitle,
          summary: 'Indexed public LinkedIn fashion tech updates.',
          published_at: new Date().toISOString(),
          discovered_at: new Date().toISOString(),
          category: 'LinkedIn Public Discovery',
          raw_text: text.substring(0, 1000),
          source_type: 'web_search',
          platform: 'LinkedIn Public',
          query_used: 'linkedin fashion tech contemporary design',
          runtime: 'cloud',
          agent_reach_used: false,
          trust_score: 75, // Trust Level B
          relevance_status: relevanceResult.relevance_status,
          relevance_score: relevanceResult.relevance_score,
          positioning_fit_score: relevanceResult.positioning_fit_score,
          why_it_matters_to_pranavi: relevanceResult.why_it_matters_to_pranavi,
          topic_family: relevanceResult.topic_family,
          relevance_reason: relevanceResult.relevance_reason,
          research_run_id: researchRunId
        }

        const { error: insertErr } = await admin.from('research_signals').insert({
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
          positioning_fit_score: relevanceResult.positioning_fit_score,
          why_it_matters_to_pranavi: relevanceResult.why_it_matters_to_pranavi,
          topic_family: relevanceResult.topic_family,
          relevance_reason: relevanceResult.relevance_reason,
          relevance_checked_at: new Date().toISOString(),
          processed: !relevanceResult.eligible,
          research_run_id: researchRunId,
          provenance: 'LINKEDIN_PUBLIC',
          transport_used: 'JINA_SEARCH',
          fallback_used: false
        })

        if (!insertErr) {
          insertedCount++
          resultSignals.push(signal)
        } else if (insertErr.code === '23505') {
          deduplicatedCount++
        }
      }
      sourceStatuses.linkedin_public = { status: 'public_only', transport: 'JINA_SEARCH' }
    } else {
      sourceStatuses.linkedin_public = { status: 'failed', transport: 'JINA_SEARCH' }
    }
  } catch (err: any) {
    errors.push(`LinkedIn Public Jina Search failed: ${err.message}`)
    sourceStatuses.linkedin_public = { status: 'failed', transport: 'JINA_SEARCH' }
  }

  // ==================================================
  // 4. TWITTER / X (Check Authentication Credentials & Run Search)
  // ==================================================
  const xApiKey = process.env.X_API_KEY || process.env.TWITTER_BEARER_TOKEN
  if (xApiKey && !xApiKey.startsWith('your-')) {
    try {
      const twitterRes = await fetch('https://api.twitter.com/2/tweets/search/recent?query=%23fashiontech%20OR%20%23CLO3D&max_results=10', {
        headers: {
          'Authorization': `Bearer ${xApiKey}`
        }
      })
      
      if (twitterRes.status === 200) {
        const data = await twitterRes.json()
        const tweets = data.data || []
        let xCount = 0

        for (const tweet of tweets) {
          if (xCount >= 3) break
          const tweetText = tweet.text || ''
          const tweetUrl = `https://twitter.com/i/web/status/${tweet.id}`
          const tweetTitle = tweetText.substring(0, 60) + (tweetText.length > 60 ? '...' : '')

          discoveredCount++
          xCount++

          const fingerprint = generateFingerprint(tweetUrl, tweetTitle)
          
          // Dedupe
          const { data: existing } = await admin
            .from('research_signals')
            .select('id')
            .or(`url.eq.${tweetUrl},fingerprint.eq.${fingerprint}`)
            .limit(1)

          if (existing && existing.length > 0) {
            deduplicatedCount++
            continue
          }

          const relevanceResult = await evaluateResearchRelevance(tweetTitle, tweetText)

          if (relevanceResult.eligible) {
            acceptedCount++
          } else {
            rejectedCount++
          }

          const signal: CanonicalResearchSignal = {
            source_name: 'Twitter/X Search',
            source_url: tweetUrl,
            title: tweetTitle,
            summary: tweetText,
            published_at: new Date().toISOString(),
            discovered_at: new Date().toISOString(),
            category: 'X/Twitter Discovery',
            raw_text: tweetText,
            source_type: 'web_search',
            platform: 'Twitter/X',
            query_used: '#fashiontech OR #CLO3D',
            runtime: 'cloud',
            agent_reach_used: false,
            trust_score: 65, // Trust Level C
            relevance_status: relevanceResult.relevance_status,
            relevance_score: relevanceResult.relevance_score,
            positioning_fit_score: relevanceResult.positioning_fit_score,
            why_it_matters_to_pranavi: relevanceResult.why_it_matters_to_pranavi,
            topic_family: relevanceResult.topic_family,
            relevance_reason: relevanceResult.relevance_reason,
            research_run_id: researchRunId
          }

          const { error: insertErr } = await admin.from('research_signals').insert({
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
            positioning_fit_score: relevanceResult.positioning_fit_score,
            why_it_matters_to_pranavi: relevanceResult.why_it_matters_to_pranavi,
            topic_family: relevanceResult.topic_family,
            relevance_reason: relevanceResult.relevance_reason,
            relevance_checked_at: new Date().toISOString(),
            processed: !relevanceResult.eligible,
            research_run_id: researchRunId,
            provenance: 'TWITTER_X',
            transport_used: 'TWITTER_API',
            fallback_used: false
          })

          if (!insertErr) {
            insertedCount++
            resultSignals.push(signal)
          } else if (insertErr.code === '23505') {
            deduplicatedCount++
          }
        }
        sourceStatuses.twitter_x = { status: 'active', transport: 'TWITTER_API' }
      } else if (twitterRes.status === 401 || twitterRes.status === 403) {
        sourceStatuses.twitter_x = { status: 'auth_required', transport: 'TWITTER_API' }
      } else {
        sourceStatuses.twitter_x = { status: 'failed', transport: 'TWITTER_API' }
      }
    } catch (err: any) {
      errors.push(`Twitter/X search failed: ${err.message}`)
      sourceStatuses.twitter_x = { status: 'failed', transport: 'TWITTER_API' }
    }
  } else {
    sourceStatuses.twitter_x = { status: 'auth_required', transport: 'TWITTER_API' }
  }

  // Persist Source Statuses in Database settings for UI display
  try {
    await admin
      .from('automation_settings')
      .update({ research_sources_status: sourceStatuses })
      .eq('user_id', userId)
  } catch (dbErr) {
    console.error('Failed to update research_sources_status settings:', dbErr)
  }

  return {
    success: insertedCount > 0 || deduplicatedCount > 0,
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
