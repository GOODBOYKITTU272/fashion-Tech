import { NextResponse } from 'next/server'
import { verifyServerAuthorization } from '@/lib/auth-guard'
import { runProductionPipeline } from '@/lib/pipeline-orchestrator'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  const auth = await verifyServerAuthorization(req)
  if (!auth.authorized || !auth.userId) {
    return auth.response || NextResponse.json({ error: '401 Unauthorized' }, { status: 401 })
  }

  try {
    const trace = await runProductionPipeline(auth.userId)
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
  // Support Vercel Cron trigger or authorized server call
  const authHeader = req.headers.get('Authorization')
  const cronHeader = req.headers.get('x-vercel-cron')
  
  if (!cronHeader && (!authHeader || !authHeader.startsWith('Bearer '))) {
    // If query contains cron trigger bypass from Vercel platform
    const auth = await verifyServerAuthorization(req)
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ error: '401 Unauthorized' }, { status: 401 })
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
