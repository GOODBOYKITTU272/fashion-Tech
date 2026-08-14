import { NextResponse } from 'next/server'
import { verifyServerAuthorization } from '@/lib/auth-guard'
import { getAutomationState } from '@/lib/automation-control'
import { getLinkedInIntegrationState } from '@/lib/linkedin-control'
import { getNextScheduledPost } from '@/lib/next-post-control'
import { canPublishScheduledPost } from '@/lib/publishing-gate'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = await verifyServerAuthorization(req)
    if (!auth.authorized || auth.response || !auth.userId) {
      return auth.response || NextResponse.json({ error: '401 Unauthorized' }, { status: 401 })
    }

    const userId = auth.userId

    // Execute server-side operational state queries strictly for authenticated userId
    const [automationState, linkedinState, nextPost] = await Promise.all([
      getAutomationState(userId),
      getLinkedInIntegrationState(userId),
      getNextScheduledPost(userId)
    ])

    // Evaluate gate against real next post if available, or default scheduled check
    const gateResult = await canPublishScheduledPost({
      userId,
      contentStatus: nextPost?.status || 'scheduled',
      qualityGateStatus: nextPost?.quality_gate_status || 'passed',
      confidenceScore: nextPost?.confidence_score ?? 85,
      personalContextStatus: 'passed'
    })

    return NextResponse.json({
      automation: automationState,
      linkedin: linkedinState,
      next_post: nextPost,
      publishing_gate: gateResult
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
      error: error.message
    }, { status: 500 })
  }
}
