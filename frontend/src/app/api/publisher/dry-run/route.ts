import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { publishScheduledPost, validatePublisherPayload } from '@/lib/linkedin-publisher'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    let userId: string | null = null
    const admin = getSupabaseAdmin()

    if (bearerToken) {
      const { data: { user } } = await admin.auth.getUser(bearerToken)
      if (user && user.email === 'pranaviyadav57@gmail.com') {
        userId = user.id
      }
    }

    if (!userId) {
      const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
      userId = usersData?.users?.[0]?.id || '22ff14e8-10c3-44b8-a77b-1a656e1255ef'
    }

    const body = await req.json().catch(() => ({}))
    const calendarId = body.calendarId

    // If no calendarId passed, check if user has any next scheduled calendar post to dry-test
    let targetCalendarId = calendarId

    if (!targetCalendarId) {
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

    // Execute dry-run publishing attempt
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
