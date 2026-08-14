import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data: conn, error: connError } = await supabase
      .from('linkedin_connections')
      .select('id, user_id, linkedin_member_urn, granted_scopes, integration_status, auth_status, expires_at, last_verified_at, reauthorization_required')
      .order('updated_at', { ascending: false })
      .limit(1)

    const { data: settings } = await supabase
      .from('automation_settings')
      .select('auto_mode_enabled, pause_all_publishing, min_confidence_score')
      .order('updated_at', { ascending: false })
      .limit(1)

    const hasClientCredentials = !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET)

    let integrationStatus = 'WAITING_FOR_API_ACCESS'
    
    if (conn && conn.length > 0 && conn[0].integration_status) {
      integrationStatus = conn[0].integration_status
    } else if (!hasClientCredentials) {
      integrationStatus = 'WAITING_FOR_API_ACCESS'
    } else {
      integrationStatus = 'READY_FOR_OAUTH'
    }

    const connectionData = conn?.[0] || null

    return NextResponse.json({
      integration_status: integrationStatus,
      auth_status: connectionData?.auth_status || 'valid',
      linkedin_member_urn: connectionData?.linkedin_member_urn || null,
      granted_scopes: connectionData?.granted_scopes || [],
      expires_at: connectionData?.expires_at || null,
      last_verified_at: connectionData?.last_verified_at || null,
      reauthorization_required: connectionData?.reauthorization_required || false,
      has_developer_credentials: hasClientCredentials,
      auto_mode_enabled: settings?.[0]?.auto_mode_enabled ?? true,
      pause_all_publishing: settings?.[0]?.pause_all_publishing ?? false,
      min_confidence_score: settings?.[0]?.min_confidence_score ?? 70,
    })
  } catch (error: any) {
    return NextResponse.json({
      integration_status: 'WAITING_FOR_API_ACCESS',
      auth_status: 'valid',
      linkedin_member_urn: null,
      granted_scopes: [],
      expires_at: null,
      last_verified_at: null,
      reauthorization_required: false,
      has_developer_credentials: false,
      auto_mode_enabled: true,
      pause_all_publishing: false,
      min_confidence_score: 70,
      error: error.message
    })
  }
}
