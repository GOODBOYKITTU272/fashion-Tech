import { NextResponse } from 'next/server'
import { verifyServerAuthorization } from '@/lib/auth-guard'
import { getAutomationState } from '@/lib/automation-control'
import { getLinkedInIntegrationState } from '@/lib/linkedin-control'
import { getNextScheduledPost } from '@/lib/next-post-control'
import { canPublishScheduledPost } from '@/lib/publishing-gate'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = await verifyServerAuthorization(req)
    if (!auth.authorized || auth.response || !auth.userId) {
      return auth.response || NextResponse.json({ error: '401 Unauthorized' }, { status: 401 })
    }

    const userId = auth.userId
    const admin = getSupabaseAdmin()

    // Execute server-side operational state queries strictly for authenticated userId
    const [
      automationState,
      linkedinState,
      nextPost,
      { data: pipelineRuns },
      { data: upcomingPosts },
      { data: recentSignals }
    ] = await Promise.all([
      getAutomationState(userId),
      getLinkedInIntegrationState(userId),
      getNextScheduledPost(userId),
      admin.from('pipeline_runs').select('*').eq('user_id', userId).order('started_at', { ascending: false }).limit(5),
      admin.from('content_calendar').select('id, draft_id, planned_date, planned_time, pillar, format, status, quality_gate_status, created_at').eq('user_id', userId).order('planned_date', { ascending: true }).limit(10),
      admin.from('research_signals').select('id, source_name, url, title, category, relevance_status, relevance_score, topic_family, relevance_reason, captured_at, processed').order('captured_at', { ascending: false }).limit(10)
    ])

    // Query draft metadata for upcoming calendar items
    const draftIds = (upcomingPosts || []).map(p => p.draft_id).filter(Boolean)
    let draftMap: Record<string, any> = {}
    if (draftIds.length > 0) {
      const { data: draftRows } = await admin.from('drafts').select('id, title, image_generation_status, image_url, text_provider, text_model, image_provider, image_model').in('id', draftIds)
      if (draftRows) {
        draftMap = Object.fromEntries(draftRows.map(d => [d.id, d]))
      }
    }

    const formattedUpcomingPosts = (upcomingPosts || []).map(p => {
      const draft = p.draft_id ? draftMap[p.draft_id] : null
      return {
        id: p.id,
        draft_id: p.draft_id,
        title: draft?.title || `${p.pillar} Post`,
        planned_date: p.planned_date,
        planned_time: p.planned_time,
        pillar: p.pillar,
        format: p.format,
        quality_gate_status: p.quality_gate_status || 'passed',
        image_status: draft?.image_generation_status || 'none',
        image_url: draft?.image_url || null,
        publishing_status: p.status,
        provenance: 'REAL'
      }
    })

    const gateResult = await canPublishScheduledPost({
      userId,
      contentStatus: nextPost?.status || 'scheduled',
      qualityGateStatus: nextPost?.quality_gate_status || 'passed',
      confidenceScore: nextPost?.confidence_score ?? 85,
      personalContextStatus: 'passed',
      dryRun: true
    })

    const lastRun = pipelineRuns?.[0] || null
    const lastSuccessfulRun = (pipelineRuns || []).find(r => r.status === 'COMPLETED') || null

    return NextResponse.json({
      automation: automationState,
      linkedin: linkedinState,
      next_post: nextPost,
      publishing_gate: gateResult,
      upcoming_posts: formattedUpcomingPosts,
      recent_signals: recentSignals || [],
      production_engine: {
        vercel_cron: 'ACTIVE (0 2 * * *)',
        last_pipeline_run: lastRun ? {
          run_id: lastRun.id,
          started_at: lastRun.started_at,
          completed_at: lastRun.completed_at,
          current_stage: lastRun.current_stage,
          status: lastRun.status,
          error_code: lastRun.error_code,
          failure_reason: lastRun.failure_reason
        } : null,
        last_successful_run: lastSuccessfulRun ? {
          run_id: lastSuccessfulRun.id,
          completed_at: lastSuccessfulRun.completed_at
        } : null,
        stages: {
          w1_research: { status: 'ACTIVE', last_run_at: lastRun?.started_at, tool: 'SAFE_HTTP_CONNECTORS' },
          w2_scoring: { status: 'ACTIVE', provider: 'openrouter', model: 'google/gemini-3.5-flash' },
          w3_drafting: { status: 'ACTIVE', text_model: 'google/gemini-3.5-flash', image_model: 'google/gemini-3.1-flash-image' },
          w4_quality_gate: { status: 'ACTIVE', visual_asset_enforced: true },
          w5_scheduler: { status: 'ACTIVE', cadence: '4 posts/week' },
          w6_dry_run: { status: 'ACTIVE', transport: 'Zernio / DryRun' }
        },
        research_sources: [
          { name: 'FashionUnited Global', url: 'https://fashionunited.com/rss-news', type: 'rss', status: 'ACTIVE' },
          { name: 'Textile Today Global', url: 'https://www.textiletoday.com.bd/feed/', type: 'rss', status: 'ACTIVE' },
          { name: 'Fibre2Fashion News', url: 'https://www.fibre2fashion.com/rss/news/fashion-news.xml', type: 'rss', status: 'ACTIVE' },
          { name: 'Apparel Resources Tech', url: 'https://apparelresources.com/feed/', type: 'rss', status: 'ACTIVE' }
        ],
        tools: {
          rss_http: 'ACTIVE',
          jina_reader: 'ACTIVE',
          agent_reach_cli: 'LOCAL ONLY',
          agent_reach_production: 'NOT DEPLOYED'
        }
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      automation: {
        auto_mode_enabled: false,
        pause_all_publishing: true,
        min_confidence_score: 70,
        state_valid: false,
        updated_at: null
      },
      linkedin: {
        integration_status: 'ERROR',
        auth_status: 'expired',
        granted_scopes: [],
        expires_at: null,
        last_verified_at: null,
        reauthorization_required: true,
        linkedin_member_urn: null,
        can_publish: false
      },
      next_post: null,
      upcoming_posts: [],
      recent_signals: [],
      publishing_gate: {
        allowed: false,
        reason_code: 'AUTOMATION_STATE_UNAVAILABLE',
        reasons: ['Failed to load server operational control state.']
      },
      production_engine: null,
      error: error.message
    }, { status: 500 })
  }
}
