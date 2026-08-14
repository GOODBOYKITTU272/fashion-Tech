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
    const [automationState, linkedinState, nextPost, { data: pipelineRuns }] = await Promise.all([
      getAutomationState(userId),
      getLinkedInIntegrationState(userId),
      getNextScheduledPost(userId),
      admin.from('pipeline_runs').select('*').eq('user_id', userId).order('started_at', { ascending: false }).limit(1)
    ])

    // Evaluate gate against real next post if available, or default scheduled check
    const gateResult = await canPublishScheduledPost({
      userId,
      contentStatus: nextPost?.status || 'scheduled',
      qualityGateStatus: nextPost?.quality_gate_status || 'passed',
      confidenceScore: nextPost?.confidence_score ?? 85,
      personalContextStatus: 'passed',
      dryRun: true
    })

    const lastRun = pipelineRuns?.[0] || null

    return NextResponse.json({
      automation: automationState,
      linkedin: linkedinState,
      next_post: nextPost,
      publishing_gate: gateResult,
      health: {
        production_automation: 'VERCEL_CRON_READY',
        last_pipeline_run: lastRun ? {
          run_id: lastRun.id,
          started_at: lastRun.started_at,
          completed_at: lastRun.completed_at,
          current_stage: lastRun.current_stage,
          status: lastRun.status,
          error_code: lastRun.error_code,
          failure_reason: lastRun.failure_reason,
          id_trace: {
            research_signal_id: lastRun.research_signal_id,
            topic_cluster_id: lastRun.topic_cluster_id,
            draft_id: lastRun.draft_id,
            calendar_id: lastRun.calendar_id,
            publishing_attempt_id: lastRun.publishing_attempt_id
          }
        } : null,
        components: {
          research_ingestion: 'SAFE_HTTP_CONNECTORS_READY',
          agent_reach_local: 'READY',
          agent_reach_production: 'NOT_DEPLOYED',
          scoring: 'OPENAI_FAIL_CLOSED',
          drafting: 'OPENAI_FAIL_CLOSED',
          quality_gate: 'AUTHORITATIVE_ENFORCED',
          scheduler: 'WEEKDAY_FIRST_BASELINE',
          publisher_dry_run: 'ZERO_NETWORK_TRANSPORT'
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
        can_publish: false,
        can_read_post_analytics: false,
        can_read_profile_analytics: false
      },
      next_post: null,
      publishing_gate: {
        allowed: false,
        reason_code: 'AUTOMATION_STATE_UNAVAILABLE',
        reasons: ['Failed to load server operational control state.']
      },
      health: null,
      error: error.message
    }, { status: 500 })
  }
}
