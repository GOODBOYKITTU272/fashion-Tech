import { NextResponse } from 'next/server'
import { verifyServerAuthorization } from '@/lib/auth-guard'
import { runAgentReachW1Ingestion } from '@/lib/agent-reach-adapter'
import { runRedditResearchAutomation } from '@/lib/social-research/reddit-adapter'
import { runLinkedInResearchAutomation } from '@/lib/social-research/linkedin-adapter'
import { runXResearchAutomation } from '@/lib/social-research/x-adapter'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const auth = await verifyServerAuthorization(req)
    if (!auth.authorized || auth.response || !auth.userId) {
      return auth.response || NextResponse.json({ error: '401 Unauthorized' }, { status: 401 })
    }

    const userId = auth.userId

    // Run master automated research cycle across RSS, Jina, Reddit, LinkedIn, and X
    const [rssResult, redditResult, linkedinResult, xResult] = await Promise.all([
      runAgentReachW1Ingestion(userId),
      runRedditResearchAutomation(userId),
      runLinkedInResearchAutomation(userId),
      runXResearchAutomation()
    ])

    const totalDiscovered = rssResult.signals_discovered + redditResult.signals_discovered + linkedinResult.signals_discovered + xResult.signals_discovered
    const totalAccepted = rssResult.signals_accepted + redditResult.signals_accepted + linkedinResult.signals_accepted + xResult.signals_accepted
    const totalRejected = rssResult.signals_rejected + redditResult.signals_rejected + linkedinResult.signals_rejected + xResult.signals_rejected
    const totalDeduplicated = rssResult.signals_deduplicated + redditResult.signals_deduplicated + linkedinResult.signals_deduplicated

    return NextResponse.json({
      success: true,
      runtime: 'SAFE_HTTP_CONNECTORS',
      signals_discovered: totalDiscovered,
      signals_accepted: totalAccepted,
      signals_rejected: totalRejected,
      signals_deduplicated: totalDeduplicated,
      adapters: {
        rss_jina: { status: 'ACTIVE', discovered: rssResult.signals_discovered, accepted: rssResult.signals_accepted },
        reddit: { status: redditResult.status, discovered: redditResult.signals_discovered, accepted: redditResult.signals_accepted },
        linkedin: { status: linkedinResult.status, discovered: linkedinResult.signals_discovered, accepted: linkedinResult.signals_accepted },
        x_twitter: { status: xResult.status, error: xResult.error }
      },
      errors: [...rssResult.errors, ...(redditResult.error ? [redditResult.error] : [])]
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
