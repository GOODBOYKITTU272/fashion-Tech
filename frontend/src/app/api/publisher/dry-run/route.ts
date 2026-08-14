import { NextResponse } from 'next/server'
import { verifyServerAuthorization } from '@/lib/auth-guard'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { publishScheduledPost, validatePublisherPayload } from '@/lib/linkedin-publisher'

export async function POST(req: Request) {
  try {
    // 1. Enforce strict server authorization (session verification & email check)
    const auth = await verifyServerAuthorization(req)
    if (!auth.authorized || auth.response || !auth.userId) {
      return auth.response || NextResponse.json({ error: '401 Unauthorized' }, { status: 401 })
    }

    const userId = auth.userId
    const admin = getSupabaseAdmin()
    const body = await req.json().catch(() => ({}))
    let targetCalendarId = body.calendarId

    // 2. Validate calendar item ownership if calendarId is provided
    if (targetCalendarId) {
      const { data: item, error: itemErr } = await admin
        .from('content_calendar')
        .select('id, user_id')
        .eq('id', targetCalendarId)
        .single()

      if (itemErr || !item) {
        return NextResponse.json({
          success: false,
          status: 'BLOCKED',
          reason_code: 'CONTENT_NOT_READY',
          reasons: ['Scheduled calendar item not found.']
        }, { status: 404 })
      }

      if (item.user_id !== userId) {
        return NextResponse.json({
          success: false,
          status: 'BLOCKED',
          reason_code: 'PERMISSION_MISSING',
          reasons: ['Forbidden: You do not have permission to access this calendar item.']
        }, { status: 403 })
      }
    } else {
      // If calendarId is omitted, query next scheduled post strictly for authenticated user
      const todayStr = new Date().toISOString().split('T')[0]
      const { data: calItems } = await admin
        .from('content_calendar')
        .select('id')
        .eq('user_id', userId)
        .gte('planned_date', todayStr)
        .order('planned_date', { ascending: true })
        .limit(1)

      if (calItems && calItems.length > 0) {
        targetCalendarId = calItems[0].id
      }
    }

    if (!targetCalendarId) {
      return NextResponse.json({
        success: false,
        status: 'BLOCKED',
        reason_code: 'CONTENT_NOT_READY',
        reasons: ['No scheduled calendar item found for publisher dry-run test. Add a post to calendar first.']
      }, { status: 400 })
    }

    // 3. Execute dry-run publishing attempt with verified authenticated userId
    const mode = body.validateOnly ? 'validate' : 'dry-run'
    let result

    if (mode === 'validate') {
      result = await validatePublisherPayload(userId, targetCalendarId)
    } else {
      result = await publishScheduledPost({
        userId,
        calendarId: targetCalendarId,
        dryRun: true
      })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('API /api/publisher/dry-run Exception:', error)
    return NextResponse.json({
      success: false,
      status: 'ERROR',
      reason_code: 'UNKNOWN_ERROR',
      reasons: [error.message || 'An error occurred during publisher dry-run execution.']
    }, { status: 500 })
  }
}
