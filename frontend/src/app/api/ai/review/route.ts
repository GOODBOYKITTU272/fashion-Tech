import { NextResponse } from 'next/server'
import { generateWeeklyReview } from '@/lib/ai'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const expectedKey = process.env.N8N_API_KEY

    // Auth check if configured
    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
