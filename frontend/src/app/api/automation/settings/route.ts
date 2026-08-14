import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { auto_mode_enabled, pause_all_publishing, min_confidence_score } = body

    const admin = getSupabaseAdmin()

    // Resolve owner user_id
    const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
    let ownerUserId = usersData?.users?.[0]?.id

    if (!ownerUserId) {
      const { data: existing } = await admin.from('automation_settings').select('user_id').limit(1)
      ownerUserId = existing?.[0]?.user_id
    }

    if (!ownerUserId) {
      return NextResponse.json({ error: 'No authenticated system user found to update automation settings.' }, { status: 400 })
    }

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
