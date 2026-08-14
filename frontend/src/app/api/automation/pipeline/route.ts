import { NextResponse } from 'next/server'
import { verifyServerAuthorization } from '@/lib/auth-guard'
import { runProductionPipeline } from '@/lib/pipeline-orchestrator'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

function verifyCronSecret(req: Request): boolean {
  const authHeader = req.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || cronSecret.trim() === '') {
    return false
  }

  if (authHeader && authHeader === `Bearer ${cronSecret}`) {
    return true
  }

  return false
}

export async function POST(req: Request) {
  const isCronAuthorized = verifyCronSecret(req)
  let userId: string | null = null

  if (isCronAuthorized) {
    const admin = getSupabaseAdmin()
    const { data: users } = await admin.auth.admin.listUsers()
    const targetUser = users?.users?.find(u => u.email === 'pranaviyadav57@gmail.com')
    userId = targetUser?.id || null
  } else {
    const auth = await verifyServerAuthorization(req)
    if (!auth.authorized || !auth.userId) {
      return auth.response || NextResponse.json({ error: '401 Unauthorized: Invalid or missing authorization token' }, { status: 401 })
    }
    userId = auth.userId
  }

  if (!userId) {
    return NextResponse.json({ error: '401 Unauthorized: Target user not resolved' }, { status: 401 })
  }

  try {
    const trace = await runProductionPipeline(userId)
    return NextResponse.json({
      message: 'Production pipeline execution finished',
      trace
    })
  } catch (error: any) {
    console.error('API /api/automation/pipeline Exception:', error)
    return NextResponse.json({
      error: error.message || 'Pipeline execution failed',
      status: 'FAILED'
    }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const isCronAuthorized = verifyCronSecret(req)

  if (!isCronAuthorized) {
    // If not CRON_SECRET authorized, fall back to checking Supabase session authorization
    const auth = await verifyServerAuthorization(req)
    if (!auth.authorized || !auth.userId) {
      return NextResponse.json({
        error: '401 Unauthorized: CRON_SECRET or valid Bearer session token is required.'
      }, { status: 401 })
    }
  }

  // Resolve targeted single user (pranaviyadav57@gmail.com)
  const admin = getSupabaseAdmin()
  const { data: users } = await admin.auth.admin.listUsers()
  const targetUser = users?.users?.find(u => u.email === 'pranaviyadav57@gmail.com')

  if (!targetUser) {
    return NextResponse.json({ error: 'Target user not found for production cron' }, { status: 404 })
  }

  try {
    const trace = await runProductionPipeline(targetUser.id)
    return NextResponse.json({
      message: 'Production Vercel Cron pipeline execution finished',
      trace
    })
  } catch (error: any) {
    console.error('Cron /api/automation/pipeline Exception:', error)
    return NextResponse.json({
      error: error.message || 'Cron pipeline execution failed',
      status: 'FAILED'
    }, { status: 500 })
  }
}
