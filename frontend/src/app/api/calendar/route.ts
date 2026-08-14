import { NextResponse } from 'next/server'
import { verifyServerAuthorization } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

function formatTimeToIST(timeStr: string | null): string {
  if (!timeStr) return '8:30 PM IST'
  const parts = timeStr.split(':')
  if (parts.length < 2) return '8:30 PM IST'
  let hours = parseInt(parts[0], 10)
  const minutes = parts[1]
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${hours}:${minutes} ${ampm} IST`
}

export async function GET(req: Request) {
  try {
    const auth = await verifyServerAuthorization(req)
    if (!auth.authorized || auth.response || !auth.userId) {
      return auth.response || NextResponse.json({ error: '401 Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const userId = auth.userId
    const admin = getSupabaseAdmin()

    let query = admin
      .from('content_calendar')
      .select('id, draft_id, planned_date, planned_time, pillar, format, status, quality_gate_status, confidence_score, source, external_platform, external_status, external_timezone, external_scheduled_at, approval_status, carousel_pdf_url, carousel_cover_url, created_at')
      .eq('user_id', userId)

    if (startDate) query = query.gte('planned_date', startDate)
    if (endDate) query = query.lte('planned_date', endDate)

    const { data: calendarRows, error } = await query.order('planned_date', { ascending: true }).order('planned_time', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const draftIds = (calendarRows || []).map(p => p.draft_id).filter(Boolean)
    let draftMap: Record<string, any> = {}
    if (draftIds.length > 0) {
      const { data: draftRows } = await admin.from('drafts').select('id, title, hook, full_content, image_generation_status, image_url').in('id', draftIds)
      if (draftRows) {
        draftMap = Object.fromEntries(draftRows.map(d => [d.id, d]))
      }
    }

    const formattedPosts = (calendarRows || []).map(p => {
      const draft = p.draft_id ? draftMap[p.draft_id] : null
      return {
        id: p.id,
        draft_id: p.draft_id,
        title: draft?.title || `${p.pillar} Post`,
        planned_date: p.planned_date,
        planned_time: formatTimeToIST(p.planned_time),
        raw_planned_time: p.planned_time,
        pillar: p.pillar,
        format: p.format,
        quality_gate_status: p.quality_gate_status ? p.quality_gate_status.toUpperCase() : 'NOT EVALUATED',
        confidence_score: p.confidence_score,
        approval_status: p.approval_status || 'pending_approval',
        image_status: draft?.image_generation_status || 'none',
        image_url: draft?.image_url || null,
        carousel_pdf_url: p.carousel_pdf_url || null,
        publishing_status: p.status,
        source: p.source || 'internal',
        external_platform: p.external_platform || null,
        external_status: p.external_status || null,
        external_timezone: p.external_timezone || 'Asia/Kolkata',
        external_scheduled_at: p.external_scheduled_at || null,
        provenance: p.source === 'linkedin_native' ? 'LINKEDIN_NATIVE' : 'INTERNAL'
      }
    })

    return NextResponse.json({
      success: true,
      startDate,
      endDate,
      posts: formattedPosts
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
