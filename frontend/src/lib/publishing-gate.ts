import { getAutomationState } from './automation-control'
import { getLinkedInIntegrationState } from './linkedin-control'
import { logAutomationEvent } from './automation-events'

export interface PublishingEligibilityParams {
  userId?: string
  contentStatus?: string // 'approved', 'scheduled', 'draft', etc.
  qualityGateStatus?: string // 'passed', 'failed', 'needs_input', 'pending'
  confidenceScore?: number
  personalContextStatus?: string // 'passed', 'needs_input'
}

export interface PublishingEligibilityResult {
  allowed: boolean
  reason_code: string
  reasons: string[]
}

export async function canPublishScheduledPost(params: PublishingEligibilityParams): Promise<PublishingEligibilityResult> {
  const {
    userId,
    contentStatus = 'scheduled',
    qualityGateStatus = 'passed',
    confidenceScore = 75,
    personalContextStatus = 'passed'
  } = params

  const reasons: string[] = []

  // 1. Fetch Automation Control Plane State
  const autoState = await getAutomationState(userId)

  if (autoState.pause_all_publishing) {
    reasons.push('Publishing is explicitly paused via Emergency Failsafe toggle.')
    await logAutomationEvent({
      userId,
      eventType: 'FAILSAFE_TRIGGERED',
      severity: 'critical',
      message: 'Publishing eligibility evaluation blocked by Emergency Failsafe pause.'
    })
    return {
      allowed: false,
      reason_code: 'PUBLISHING_PAUSED',
      reasons
    }
  }

  if (!autoState.auto_mode_enabled) {
    reasons.push('AUTO MODE is currently turned OFF.')
    return {
      allowed: false,
      reason_code: 'AUTO_MODE_OFF',
      reasons
    }
  }

  // 2. Fetch Official LinkedIn Integration Readiness State
  const linkedinState = await getLinkedInIntegrationState(userId)

  if (linkedinState.integration_status !== 'CONNECTED') {
    reasons.push(`LinkedIn integration is not connected (Current state: ${linkedinState.integration_status}).`)
    return {
      allowed: false,
      reason_code: 'LINKEDIN_NOT_CONNECTED',
      reasons
    }
  }

  if (linkedinState.reauthorization_required || linkedinState.auth_status === 'expired' || linkedinState.auth_status === 'revoked') {
    reasons.push('LinkedIn authorization token has expired or requires reauthorization.')
    await logAutomationEvent({
      userId,
      eventType: 'REAUTH_REQUIRED',
      severity: 'warning',
      message: 'Publishing eligibility evaluation blocked by expired LinkedIn token.'
    })
    return {
      allowed: false,
      reason_code: 'REAUTH_REQUIRED',
      reasons
    }
  }

  if (!linkedinState.granted_scopes.includes('w_member_social')) {
    reasons.push('LinkedIn connection is missing required posting permission scope (w_member_social).')
    await logAutomationEvent({
      userId,
      eventType: 'PERMISSION_MISSING',
      severity: 'warning',
      message: 'Publishing eligibility evaluation blocked by missing w_member_social scope.'
    })
    return {
      allowed: false,
      reason_code: 'PERMISSION_MISSING',
      reasons
    }
  }

  // 3. Quality Gate & Content Verification Rules
  if (qualityGateStatus !== 'passed') {
    if (qualityGateStatus === 'needs_input' || personalContextStatus === 'needs_input') {
      reasons.push('Post requires personal story/experience input from Pranavi before publishing.')
      await logAutomationEvent({
        userId,
        eventType: 'NEEDS_INPUT',
        severity: 'info',
        message: 'Publishing eligibility gate flagged post requiring personal context.'
      })
      return {
        allowed: false,
        reason_code: 'PERSONAL_CONTEXT_MISSING',
        reasons
      }
    }

    reasons.push(`Quality gate check failed (Current quality status: ${qualityGateStatus}).`)
    await logAutomationEvent({
      userId,
      eventType: 'QUALITY_GATE_FAILED',
      severity: 'warning',
      message: `Publishing eligibility blocked because quality gate status is ${qualityGateStatus}.`
    })
    return {
      allowed: false,
      reason_code: 'QUALITY_GATE_FAILED',
      reasons
    }
  }

  if (confidenceScore < autoState.min_confidence_score) {
    reasons.push(`Post confidence score (${confidenceScore}) is below minimum threshold (${autoState.min_confidence_score}).`)
    return {
      allowed: false,
      reason_code: 'CONFIDENCE_TOO_LOW',
      reasons
    }
  }

  if (contentStatus !== 'approved' && contentStatus !== 'scheduled') {
    reasons.push(`Content status (${contentStatus}) is not eligible for publishing (must be approved or scheduled).`)
    return {
      allowed: false,
      reason_code: 'CONTENT_NOT_READY',
      reasons
    }
  }

  // ALL GATES PASSED
  return {
    allowed: true,
    reason_code: 'PASSED',
    reasons: ['All publishing eligibility gates passed successfully.']
  }
}
