import { NextResponse } from 'next/server'
import { verifyServerAuthorization } from '@/lib/auth-guard'
import { runWeeklyScheduler } from '@/lib/scheduler'

export async function POST(req: Request) {
  const auth = await verifyServerAuthorization(req)
  if (!auth.authorized) {
    return auth.response!
  }

  try {
    const result = await runWeeklyScheduler()
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Weekly scheduler run failed' }, { status: 500 })
  }
}
