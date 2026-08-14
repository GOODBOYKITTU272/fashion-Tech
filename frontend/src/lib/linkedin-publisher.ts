import { getSupabaseAdmin } from './supabase-admin'
import { canPublishScheduledPost } from './publishing-gate'
import { buildLinkedInPostPayload, LinkedInNormalizedPayload } from './linkedin-payload'
import { DryRunLinkedInTransport, TransportPublishResult } from './linkedin-transport'
import { logAutomationEvent } from './automation-events'

export interface PublishScheduledPostParams {
  userId: string
  calendarId: string
  dryRun?: boolean
}

export interface PublishResult {
  success: boolean
  status: 'DRY_RUN_SUCCESS' | 'BLOCKED' | 'DUPLICATE_ATTEMPT_BLOCKED' | 'CONTENT_PAYLOAD_INCOMPLETE' | 'MEDIA_NOT_READY' | 'ERROR'
  reason_code?: string
  reasons?: string[]
  idempotency_key?: string
  payload_preview?: LinkedInNormalizedPayload
  transport_result?: TransportPublishResult
}

/**
 * publishScheduledPost
 * Master server-side publisher orchestrator.
 * Evaluates real gate, checks idempotency, prepares payload, persists publishing_attempts, and executes DRY-RUN transport ONLY.
 */
export async function publishScheduledPost(params: PublishScheduledPostParams): Promise<PublishResult> {
  const { userId, calendarId, dryRun = true } = params

  if (!userId || !calendarId) {
    return {
      success: false,
      status: 'BLOCKED',
      reason_code: 'AUTOMATION_STATE_UNAVAILABLE',
      reasons: ['User ID and Calendar Item ID are required for publisher execution.']
    }
  }

  const admin = getSupabaseAdmin()

  try {
    // 1. Query real content calendar item and draft record
    const { data: calRows, error: calErr } = await admin
      .from('content_calendar')
      .select('id, draft_id, content_idea_id, planned_date, planned_time, pillar, format, status, quality_gate_status')
      .eq('id', calendarId)
      .eq('user_id', userId)
      .limit(1)

    if (calErr || !calRows || calRows.length === 0) {
      return {
        success: false,
        status: 'BLOCKED',
        reason_code: 'CONTENT_NOT_READY',
        reasons: ['Scheduled calendar post record not found or ownership mismatch.']
      }
    }

    const calItem = calRows[0]

    // 2. Fetch associated draft & title details
    let title = `${calItem.pillar} Post`
    let bodyText = ''
    let mediaUrl = null
    let pdfUrl = null
    let confidenceScore = 80
    let qualityStatus = calItem.quality_gate_status || 'passed'

    if (calItem.draft_id) {
      const { data: draft } = await admin
        .from('drafts')
        .select('title, full_content, quality_gate_status, confidence_score, media_url, pdf_url')
        .eq('id', calItem.draft_id)
        .single()

      if (draft) {
        title = draft.title || title
        bodyText = draft.full_content || ''
        mediaUrl = draft.media_url || null
        pdfUrl = draft.pdf_url || null
        confidenceScore = draft.confidence_score ?? confidenceScore
        qualityStatus = draft.quality_gate_status || qualityStatus
      }
    } else if (calItem.content_idea_id) {
      const { data: idea } = await admin
        .from('content_ideas')
        .select('title, core_thesis')
        .eq('id', calItem.content_idea_id)
        .single()

      if (idea) {
        title = idea.title || title
        bodyText = idea.core_thesis || ''
      }
    }

    // 3. Idempotency Key Check
    const idempotencyKey = `${userId}:${calendarId}:${calItem.planned_date}`

    const { data: existingAttempts } = await admin
      .from('publishing_attempts')
      .select('id, status, dry_run')
      .eq('user_id', userId)
      .eq('idempotency_key', idempotencyKey)
      .in('status', ['LIVE_SUCCESS', 'DRY_RUN_SUCCESS'])
      .limit(1)

    if (existingAttempts && existingAttempts.length > 0 && !dryRun) {
      await logAutomationEvent({
        userId,
        eventType: 'DUPLICATE_ATTEMPT_BLOCKED',
        severity: 'warning',
        message: `Blocked duplicate live publishing attempt for idempotency key ${idempotencyKey}.`
      })

      return {
        success: false,
        status: 'DUPLICATE_ATTEMPT_BLOCKED',
        reason_code: 'DUPLICATE_ATTEMPT_BLOCKED',
        idempotency_key: idempotencyKey,
        reasons: ['A successful publishing attempt already exists for this post and date slot.']
      }
    }

    // 4. Run Real 9-Point Publishing Eligibility Gate
    const gateResult = await canPublishScheduledPost({
      userId,
      contentStatus: calItem.status,
      qualityGateStatus: qualityStatus,
      confidenceScore: confidenceScore,
      personalContextStatus: 'passed'
    })

    // 5. Build LinkedIn Post Payload
    const payloadResult = buildLinkedInPostPayload({
      title,
      body: bodyText,
      pillar: calItem.pillar,
      format: calItem.format,
      mediaUrl,
      pdfUrl
    })

    if (!payloadResult.valid || !payloadResult.payload) {
      await logAutomationEvent({
        userId,
        eventType: payloadResult.error_code === 'MEDIA_NOT_READY' ? 'MEDIA_NOT_READY' : 'CONTENT_PAYLOAD_INCOMPLETE',
        severity: 'warning',
        message: payloadResult.error_message || 'Payload validation failed.'
      })

      return {
        success: false,
        status: payloadResult.error_code === 'MEDIA_NOT_READY' ? 'MEDIA_NOT_READY' : 'CONTENT_PAYLOAD_INCOMPLETE',
        reason_code: payloadResult.error_code,
        reasons: [payloadResult.error_message || 'Payload preparation failed.']
      }
    }

    // If gate fails, record blocked attempt and return
    if (!gateResult.allowed) {
      await admin.from('publishing_attempts').insert({
        user_id: userId,
        calendar_id: calendarId,
        attempt_number: 1,
        request_type: payloadResult.payload.request_type,
        status: 'BLOCKED',
        idempotency_key: idempotencyKey,
        dry_run: true,
        error_code: gateResult.reason_code,
        failure_reason: gateResult.reasons[0],
        request_metadata: payloadResult.payload,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })

      await logAutomationEvent({
        userId,
        eventType: 'PUBLISH_GATE_BLOCKED',
        severity: 'info',
        message: `Publisher dry-run blocked by gate: ${gateResult.reason_code}`
      })

      return {
        success: false,
        status: 'BLOCKED',
        reason_code: gateResult.reason_code,
        reasons: gateResult.reasons,
        idempotency_key: idempotencyKey,
        payload_preview: payloadResult.payload
      }
    }

    // 6. Execute Dry-Run Transport ONLY (Zero HTTP calls to LinkedIn)
    const transport = new DryRunLinkedInTransport()
    const transportResult = await transport.publishPayload(payloadResult.payload)

    // 7. Persist Dry-Run Attempt in public.publishing_attempts
    await admin.from('publishing_attempts').insert({
      user_id: userId,
      calendar_id: calendarId,
      attempt_number: 1,
      request_type: payloadResult.payload.request_type,
      status: 'DRY_RUN_SUCCESS',
      idempotency_key: idempotencyKey,
      dry_run: true,
      request_metadata: payloadResult.payload,
      response_metadata: transportResult.response_metadata,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    })

    await logAutomationEvent({
      userId,
      eventType: 'PUBLISH_DRY_RUN_SUCCESS',
      severity: 'info',
      message: `Successfully executed W6 publisher dry-run for post: ${title}`
    })

    return {
      success: true,
      status: 'DRY_RUN_SUCCESS',
      idempotency_key: idempotencyKey,
      payload_preview: payloadResult.payload,
      transport_result: transportResult
    }
  } catch (err: any) {
    console.error('W6 Publisher Exception:', err)
    return {
      success: false,
      status: 'ERROR',
      reason_code: 'UNKNOWN_ERROR',
      reasons: [err.message || 'An unhandled exception occurred during W6 publisher execution.']
    }
  }
}

/**
 * validatePublisherPayload
 * Independent payload validation helper. Allows testing payload formatting and document_pdf mapping even when live OAuth gate reports LINKEDIN_NOT_CONNECTED.
 */
export async function validatePublisherPayload(userId: string, calendarId: string): Promise<PublishResult> {
  const admin = getSupabaseAdmin()
  const { data: calRows } = await admin
    .from('content_calendar')
    .select('id, draft_id, content_idea_id, planned_date, pillar, format, status')
    .eq('id', calendarId)
    .eq('user_id', userId)

  if (!calRows || calRows.length === 0) {
    return {
      success: false,
      status: 'BLOCKED',
      reason_code: 'CONTENT_NOT_READY',
      reasons: ['Calendar post not found for validation.']
    }
  }

  const calItem = calRows[0]
  let title = `${calItem.pillar} Post`
  let bodyText = 'Sample content body for dry-run validation.'

  if (calItem.draft_id) {
    const { data: draft } = await admin
      .from('drafts')
      .select('title, full_content')
      .eq('id', calItem.draft_id)
      .single()

    if (draft) {
      title = draft.title || title
      bodyText = draft.full_content || bodyText
    }
  }

  const payloadResult = buildLinkedInPostPayload({
    title,
    body: bodyText,
    pillar: calItem.pillar,
    format: calItem.format
  })

  if (!payloadResult.valid || !payloadResult.payload) {
    return {
      success: false,
      status: 'CONTENT_PAYLOAD_INCOMPLETE',
      reason_code: payloadResult.error_code,
      reasons: [payloadResult.error_message || 'Payload validation failed.']
    }
  }

  const transport = new DryRunLinkedInTransport()
  const transportResult = await transport.publishPayload(payloadResult.payload)

  return {
    success: true,
    status: 'DRY_RUN_SUCCESS',
    idempotency_key: `${userId}:${calendarId}:${calItem.planned_date}`,
    payload_preview: payloadResult.payload,
    transport_result: transportResult
  }
}
