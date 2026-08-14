import { getSupabaseAdmin } from '@/lib/supabase-admin'

export type AutomationEventType =
  | 'FAILSAFE_TRIGGERED'
  | 'TOKEN_EXPIRED'
  | 'NEEDS_INPUT'
  | 'REAUTH_REQUIRED'
  | 'PERMISSION_MISSING'
  | 'QUALITY_GATE_FAILED'
  | 'DUPLICATE_ATTEMPT_BLOCKED'
  | 'CONTENT_PAYLOAD_INCOMPLETE'
  | 'MEDIA_NOT_READY'
  | 'PUBLISH_GATE_BLOCKED'
  | 'PUBLISH_DRY_RUN_SUCCESS'

export type AutomationEventSeverity = 'info' | 'warning' | 'critical'

export interface LogAutomationEventParams {
  userId: string // REQUIRED: No optional parameter or fallback to hardcoded UUID
  eventType: AutomationEventType
  severity: AutomationEventSeverity
  message: string
  metadata?: Record<string, unknown>
}

export async function logAutomationEvent(params: LogAutomationEventParams): Promise<void> {
  const { userId, eventType, severity, message, metadata } = params

  if (!userId) {
    console.error('logAutomationEvent rejected: missing required userId.')
    return
  }

  try {
    const admin = getSupabaseAdmin()

    // Deduplicate recent identical messages within 5 minutes to avoid log spam
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recent } = await admin
      .from('automation_events')
      .select('id')
      .eq('user_id', userId)
      .eq('event_type', eventType)
      .eq('message', message)
      .gte('created_at', fiveMinsAgo)
      .limit(1)

    if (recent && recent.length > 0) {
      return // Skip duplicate log within 5 minutes
    }

    await admin.from('automation_events').insert({
      user_id: userId,
      event_type: eventType,
      severity,
      message,
      metadata: metadata || null,
      created_at: new Date().toISOString()
    })
  } catch (err) {
    console.error('Failed to log automation event:', err)
  }
}
