export type RequestType = 'text' | 'image' | 'multi_image' | 'video' | 'document_pdf'

export interface RawPostContentInput {
  title: string
  body?: string | null
  pillar: string
  format: string // 'carousel', 'text', 'image', 'video'
  mediaUrl?: string | null
  pdfUrl?: string | null
  authorUrn?: string | null
}

export interface LinkedInNormalizedPayload {
  author_urn: string | null
  request_type: RequestType
  commentary: string
  visibility: 'PUBLIC'
  media_metadata?: {
    media_url?: string
    title?: string
    asset_id?: string
  }
  document_metadata?: {
    file_name?: string
    mime_type: 'application/pdf'
    title?: string
    storage_url?: string
  }
  live_requirements_status: 'COMPLETE' | 'LIVE_REQUIREMENT_MISSING'
  missing_requirements: string[]
}

export interface PayloadBuildResult {
  valid: boolean
  error_code?: 'CONTENT_PAYLOAD_INCOMPLETE' | 'MEDIA_NOT_READY'
  error_message?: string
  payload?: LinkedInNormalizedPayload
}

export function buildLinkedInPostPayload(input: RawPostContentInput): PayloadBuildResult {
  const { title, body, pillar, format, mediaUrl, pdfUrl, authorUrn } = input

  // 1. Validate commentary text body availability
  const commentaryText = body?.trim() || title?.trim()
  if (!commentaryText) {
    return {
      valid: false,
      error_code: 'CONTENT_PAYLOAD_INCOMPLETE',
      error_message: 'Post commentary text and body content are missing or empty.'
    }
  }

  // 2. Map internal content format to LinkedIn API request type
  // CRITICAL RULE: Carousel-style organic posts MUST map to document_pdf
  let requestType: RequestType = 'text'
  if (format === 'carousel' || format === 'document_pdf') {
    requestType = 'document_pdf'
  } else if (format === 'image') {
    requestType = 'image'
  } else if (format === 'video') {
    requestType = 'video'
  } else if (format === 'multi_image') {
    requestType = 'multi_image'
  }

  // 3. Document / PDF Media Preparation Validation
  let documentMetadata = undefined
  if (requestType === 'document_pdf') {
    const documentUrl = pdfUrl || mediaUrl
    // For preview/dry-run, if no custom PDF URL is passed, model the generated carousel document
    documentMetadata = {
      file_name: `${title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_carousel.pdf`,
      mime_type: 'application/pdf' as const,
      title: title,
      storage_url: documentUrl || `https://supabase.co/storage/v1/object/public/documents/${title}.pdf`
    }
  }

  // 4. Image / Video Media Validation
  let mediaMetadata = undefined
  if (requestType === 'image' || requestType === 'video') {
    if (!mediaUrl) {
      return {
        valid: false,
        error_code: 'MEDIA_NOT_READY',
        error_message: `Required media asset URL for request_type ${requestType} is missing.`
      }
    }
    mediaMetadata = {
      media_url: mediaUrl,
      title: title
    }
  }

  // 5. Track live readiness constraints (author URN availability)
  const missingReqs: string[] = []
  if (!authorUrn) {
    missingReqs.push('author_urn (LinkedIn Person/Organization URN)')
  }

  const payload: LinkedInNormalizedPayload = {
    author_urn: authorUrn || null,
    request_type: requestType,
    commentary: commentaryText,
    visibility: 'PUBLIC',
    media_metadata: mediaMetadata,
    document_metadata: documentMetadata,
    live_requirements_status: missingReqs.length === 0 ? 'COMPLETE' : 'LIVE_REQUIREMENT_MISSING',
    missing_requirements: missingReqs
  }

  return {
    valid: true,
    payload
  }
}
