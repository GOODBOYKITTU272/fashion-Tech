import { NextResponse } from 'next/server'
import { verifyServerAuthorization } from '@/lib/auth-guard'
import { runWeeklyScheduler } from '@/lib/scheduler'

export async function POST(req: Request) {
  const auth = await verifyServerAuthorization(req)
  if (!auth.authorized || !auth.userId) {
    return auth.response || NextResponse.json({ error: '401 Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runWeeklyScheduler(auth.userId)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Weekly scheduler run failed' }, { status: 500 })
  }
}
