import { NextResponse } from 'next/server'
import { generateCarouselOutline } from '@/lib/ai'
import { verifyServerAuthorization } from '@/lib/auth-guard'

export async function POST(req: Request) {
  const auth = await verifyServerAuthorization(req)
  if (!auth.authorized) {
    return auth.response!
  }

  try {
    const { postBody, pillar, topicSummary, hookSelected } = await req.json()
    if (!postBody) {
      return NextResponse.json({ error: 'Missing postBody' }, { status: 400 })
    }

    const carousel = await generateCarouselOutline(
      postBody,
      pillar || 'Educational',
      topicSummary || '',
      hookSelected || ''
    )
    return NextResponse.json(carousel)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Carousel generation failed' }, { status: 500 })
  }
}
