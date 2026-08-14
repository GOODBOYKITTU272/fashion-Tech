import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getAutomationState } from '@/lib/automation-control'
import { getLinkedInIntegrationState } from '@/lib/linkedin-control'
import { getNextScheduledPost } from '@/lib/next-post-control'
import { canPublishScheduledPost } from '@/lib/publishing-gate'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    let userId: string | null = null

    if (bearerToken) {
      const admin = getSupabaseAdmin()
      const { data: { user } } = await admin.auth.getUser(bearerToken)
      if (user && user.email === 'pranaviyadav57@gmail.com') {
        userId = user.id
      }
    }

    // Single-user fallback user resolution via admin client if token check in browser environment
    if (!userId) {
      const admin = getSupabaseAdmin()
      const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
      userId = usersData?.users?.[0]?.id || '22ff14e8-10c3-44b8-a77b-1a656e1255ef'
    }

    // Execute server-side operational state queries
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
