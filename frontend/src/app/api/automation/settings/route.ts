import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { verifyServerAuthorization } from '@/lib/auth-guard'

export async function POST(req: Request) {
  // Verify authorization
  const auth = await verifyServerAuthorization(req)
  if (!auth.authorized || !auth.userId) {
    return auth.response || NextResponse.json({ error: '401 Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { auto_mode_enabled, pause_all_publishing, min_confidence_score } = body
    const ownerUserId = auth.userId
    const admin = getSupabaseAdmin()

    const { data: updated, error } = await admin
      .from('automation_settings')
      .upsert({
        user_id: ownerUserId,
        auto_mode_enabled: typeof auto_mode_enabled === 'boolean' ? auto_mode_enabled : true,
        pause_all_publishing: typeof pause_all_publishing === 'boolean' ? pause_all_publishing : false,
        min_confidence_score: typeof min_confidence_score === 'number' ? min_confidence_score : 70,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      message: 'Automation settings updated successfully',
      settings: updated
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update automation settings' }, { status: 500 })
  }
}
