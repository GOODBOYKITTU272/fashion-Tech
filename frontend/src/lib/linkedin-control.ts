import { getSupabaseAdmin } from '@/lib/supabase-admin'

export interface LinkedInIntegrationState {
  integration_status: 'NOT_CONFIGURED' | 'WAITING_FOR_API_ACCESS' | 'READY_FOR_OAUTH' | 'CONNECTED' | 'REAUTH_REQUIRED' | 'PERMISSION_MISSING' | 'PAUSED' | 'ERROR'
  auth_status: 'valid' | 'expiring_soon' | 'expired' | 'revoked'
  granted_scopes: string[]
  expires_at: string | null
  last_verified_at: string | null
  reauthorization_required: boolean
  linkedin_member_urn: string | null
  can_publish: boolean
  can_read_post_analytics: boolean
  can_read_profile_analytics: boolean
}

export async function getLinkedInIntegrationState(userId: string): Promise<LinkedInIntegrationState> {
  const hasClientCredentials = !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET)

  if (!userId) {
    return {
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
    }
  }

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('linkedin_connections')
      .select('integration_status, auth_status, granted_scopes, expires_at, last_verified_at, reauthorization_required, linkedin_member_urn')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (error) {
      return {
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
      }
    }

    if (!data || data.length === 0) {
      const status = hasClientCredentials ? 'READY_FOR_OAUTH' : 'WAITING_FOR_API_ACCESS'
      return {
        integration_status: status,
        auth_status: 'valid',
        granted_scopes: [],
        expires_at: null,
        last_verified_at: null,
        reauthorization_required: false,
        linkedin_member_urn: null,
        can_publish: false,
        can_read_post_analytics: false,
        can_read_profile_analytics: false
      }
    }

    const conn = data[0]
    const scopes: string[] = Array.isArray(conn.granted_scopes) ? conn.granted_scopes : []
    const isTokenExpired = conn.expires_at ? new Date(conn.expires_at).getTime() < Date.now() : true
    const isConnected = conn.integration_status === 'CONNECTED' && conn.auth_status === 'valid' && !isTokenExpired && !conn.reauthorization_required

    const canPublish = isConnected && scopes.includes('w_member_social')
    const canReadPostAnalytics = isConnected && scopes.includes('r_member_postAnalytics')
    const canReadProfileAnalytics = isConnected && scopes.includes('r_member_profileAnalytics')

    return {
      integration_status: conn.integration_status || 'WAITING_FOR_API_ACCESS',
      auth_status: conn.auth_status || 'valid',
      granted_scopes: scopes,
      expires_at: conn.expires_at || null,
      last_verified_at: conn.last_verified_at || null,
      reauthorization_required: conn.reauthorization_required ?? false,
      linkedin_member_urn: conn.linkedin_member_urn || null,
      can_publish: canPublish,
      can_read_post_analytics: canReadPostAnalytics,
      can_read_profile_analytics: canReadProfileAnalytics
    }
  } catch (err) {
    console.error('Failed to query linkedin_connections (failing safe):', err)
    return {
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
    }
  }
}
