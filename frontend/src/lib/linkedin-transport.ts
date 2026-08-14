import { LinkedInNormalizedPayload } from './linkedin-payload'

export interface TransportPublishResult {
  dry_run: boolean
  simulated: boolean
  status: 'DRY_RUN_SUCCESS' | 'LIVE_SUCCESS' | 'ERROR'
  request_type: string
  payload_preview: LinkedInNormalizedPayload
  published_post_urn?: string
  response_metadata?: Record<string, any>
}

export interface LinkedInTransport {
  publishPayload(payload: LinkedInNormalizedPayload): Promise<TransportPublishResult>
}

/**
 * DryRunLinkedInTransport
 * Strictly zero network calls to linkedin.com.
 * Simulates normalized output payload preview and returns status DRY_RUN_SUCCESS.
 * NEVER creates fake LinkedIn post URNs or marks attempts as LIVE_SUCCESS.
 */
export class DryRunLinkedInTransport implements LinkedInTransport {
  async publishPayload(payload: LinkedInNormalizedPayload): Promise<TransportPublishResult> {
    // Zero external HTTP requests
    return {
      dry_run: true,
      simulated: true,
      status: 'DRY_RUN_SUCCESS',
      request_type: payload.request_type,
      payload_preview: payload,
      response_metadata: {
        timestamp: new Date().toISOString(),
        transport: 'DryRunLinkedInTransport',
        note: 'Payload generated and validated successfully. No external HTTP request was made to LinkedIn.'
      }
    }
  }
}

/**
 * OfficialLinkedInTransport
 * HARD SAFETY GUARD: Throws error to guarantee live network calls cannot execute.
 */
export class OfficialLinkedInTransport implements LinkedInTransport {
  constructor() {
    throw new Error('LINKEDIN_LIVE_PUBLISHING_DISABLED: Live LinkedIn API publishing is explicitly disabled in codebase (Task W6 Dry-Run Mode).')
  }

  async publishPayload(_payload: LinkedInNormalizedPayload): Promise<TransportPublishResult> {
    throw new Error('LINKEDIN_LIVE_PUBLISHING_DISABLED')
  }
}
