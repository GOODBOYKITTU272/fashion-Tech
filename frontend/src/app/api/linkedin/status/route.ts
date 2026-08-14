import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data: conn } = await supabase
      .from('linkedin_connections')
      .select('id, linkedin_member_urn, granted_scopes, integration_status, auth_status, expires_at, last_verified_at, reauthorization_required')
      .limit(1)

    const { data: settings } = await supabase
      .from('automation_settings')
      .select('auto_mode_enabled, pause_all_publishing, min_confidence_score')
      .limit(1)

    const hasClientCredentials = !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET)

    let status = 'WAITING_FOR_API_ACCESS'
    if (!hasClientCredentials) {
      status = 'WAITING_FOR_API_ACCESS'
    } else if (conn && conn.length > 0) {
      status = conn[0].integration_status
    } else {
      status = 'READY_FOR_OAUTH'
    }

    return NextResponse.json({
      integration_status: status,
      has_developer_credentials: hasClientCredentials,
      connection: conn?.[0] || null,
      auto_mode_enabled: settings?.[0]?.auto_mode_enabled ?? true,
      pause_all_publishing: settings?.[0]?.pause_all_publishing ?? false,
      min_confidence_score: settings?.[0]?.min_confidence_score ?? 70,
    })
  } catch (error: any) {
    return NextResponse.json({
      integration_status: 'WAITING_FOR_API_ACCESS',
      has_developer_credentials: false,
      connection: null,
      auto_mode_enabled: true,
      pause_all_publishing: false,
      error: error.message
    })
  }
}
