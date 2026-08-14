export type LinkedInErrorClassification = 
  | 'AUTH_ERROR'
  | 'PERMISSION_ERROR'
  | 'RATE_LIMITED'
  | 'TRANSIENT_SERVER_ERROR'
  | 'VALIDATION_ERROR'
  | 'MEDIA_ERROR'
  | 'UNKNOWN_ERROR'

export interface ErrorClassificationResult {
  category: LinkedInErrorClassification
  retryable: boolean
  suggested_action: string
  http_status?: number
}

export function classifyLinkedInError(statusCode?: number, responseBody?: any): ErrorClassificationResult {
  if (!statusCode) {
    return {
      category: 'UNKNOWN_ERROR',
      retryable: false,
      suggested_action: 'Inspect system logs for unhandled internal exceptions.'
    }
  }

  if (statusCode === 401) {
    return {
      category: 'AUTH_ERROR',
      retryable: false,
      http_status: 401,
      suggested_action: 'LinkedIn OAuth token has expired or is invalid. Trigger re-authorization flow via /api/auth/linkedin/login.'
    }
  }

  if (statusCode === 403) {
    return {
      category: 'PERMISSION_ERROR',
      retryable: false,
      http_status: 403,
      suggested_action: 'Missing required OAuth scope (e.g. w_member_social). Re-authorize with updated member permissions.'
    }
  }

  if (statusCode === 429) {
    return {
      category: 'RATE_LIMITED',
      retryable: true,
      http_status: 429,
      suggested_action: 'LinkedIn API rate limit exceeded. Respect Retry-After header and execute exponential backoff.'
    }
  }

  if (statusCode >= 500 && statusCode <= 599) {
    return {
      category: 'TRANSIENT_SERVER_ERROR',
      retryable: true,
      http_status: statusCode,
      suggested_action: 'LinkedIn server error. Retry request up to 3 attempts using exponential backoff.'
    }
  }

  if (statusCode === 400) {
    const message = JSON.stringify(responseBody || '').toLowerCase()
    if (message.includes('asset') || message.includes('media') || message.includes('upload')) {
      return {
        category: 'MEDIA_ERROR',
        retryable: false,
        http_status: 400,
        suggested_action: 'Media asset processing failed. Verify document PDF or image MIME type and file integrity.'
      }
    }

    return {
      category: 'VALIDATION_ERROR',
      retryable: false,
      http_status: 400,
      suggested_action: 'Request payload validation error. Correct JSON payload formatting before retrying.'
    }
  }

  return {
    category: 'UNKNOWN_ERROR',
    retryable: false,
    http_status: statusCode,
    suggested_action: 'Unclassified HTTP response. Check LinkedIn API error details.'
  }
}
