import { LinkedInNormalizedPayload } from './linkedin-payload'
import { LinkedInTransport, TransportPublishResult } from './linkedin-transport'

export class ZernioLinkedInTransport implements LinkedInTransport {
  private apiKey: string

  constructor(apiKey?: string) {
    const key = apiKey || process.env.ZERNIO_API_KEY
    if (!key || key.startsWith('your-')) {
      throw new Error('ZERNIO_UNAVAILABLE: ZERNIO_API_KEY environment variable is missing or unconfigured.')
    }
    this.apiKey = key
  }

  /**
   * getLinkedInAccountId
   * Queries Zernio accounts API to dynamically resolve connected active LinkedIn account ID.
   */
  private async getLinkedInAccountId(): Promise<string> {
    const res = await fetch('https://api.zernio.com/v1/accounts', {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`ZERNIO_UNAVAILABLE: Failed to fetch accounts from Zernio API (HTTP ${res.status}): ${errText}`)
    }

    const data = await res.json()
    const accounts = data.accounts || []
    const linkedinAccount = accounts.find((a: any) => a.platform === 'linkedin' && a.isActive !== false)

    if (!linkedinAccount || !linkedinAccount._id) {
      throw new Error('ZERNIO_UNAVAILABLE: No active connected LinkedIn profile account found in Zernio dashboard.')
    }

    return linkedinAccount._id
  }

  /**
   * publishPayload
   * Publishes post payload directly to live LinkedIn personal profile via Zernio API.
   */
  async publishPayload(payload: LinkedInNormalizedPayload): Promise<TransportPublishResult> {
    const accountId = await this.getLinkedInAccountId()

    const mediaItems: Array<{ type: string; url: string }> = []

    const pdfUrl = payload.document_metadata?.storage_url
    const mediaUrl = payload.media_metadata?.media_url

    if (pdfUrl) {
      mediaItems.push({
        type: 'document',
        url: pdfUrl
      })
    } else if (mediaUrl) {
      mediaItems.push({
        type: 'image',
        url: mediaUrl
      })
    }

    const zernioBody = {
      platforms: [{ platform: 'linkedin', accountId }],
      content: payload.commentary,
      mediaItems: mediaItems.length > 0 ? mediaItems : undefined,
      publishNow: true
    }

    const res = await fetch('https://api.zernio.com/v1/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(zernioBody)
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`ZERNIO_PUBLISH_FAILED: Zernio API returned error (HTTP ${res.status}): ${errText}`)
    }

    const data = await res.json()
    const postObj = data.post
    const platformInfo = postObj?.platforms?.[0] || {}

    const publishedUrn = platformInfo.platformPostId || postObj?.platformPostId || postObj?._id
    const publishedUrl = platformInfo.platformPostUrl || postObj?.platformPostUrl || `https://www.linkedin.com/feed/update/${publishedUrn}/`

    return {
      dry_run: false,
      simulated: false,
      status: 'LIVE_SUCCESS',
      request_type: payload.request_type,
      payload_preview: payload,
      published_post_urn: publishedUrn,
      response_metadata: {
        timestamp: new Date().toISOString(),
        transport: 'ZernioLinkedInTransport',
        zernio_post_id: postObj?._id,
        published_urn: publishedUrn,
        published_url: publishedUrl,
        raw_response: data
      }
    }
  }
}
