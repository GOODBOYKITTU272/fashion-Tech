import { NextResponse } from 'next/server'
import { generateWeeklyReview } from '@/lib/ai'
import { verifyServerAuthorization } from '@/lib/auth-guard'

export async function POST(req: Request) {
  const auth = await verifyServerAuthorization(req)
  if (!auth.authorized) {
    return auth.response!
  }

  try {
    const { metrics, brandProfile } = await req.json()
    if (!metrics) {
      return NextResponse.json({ error: 'Missing metrics' }, { status: 400 })
    }

    const review = await generateWeeklyReview(metrics, brandProfile || {})
    return NextResponse.json(review)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Weekly review failed' }, { status: 500 })
  }
}
