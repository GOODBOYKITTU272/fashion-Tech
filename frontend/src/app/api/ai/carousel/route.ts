import { NextResponse } from 'next/server'
import { generateCarouselOutline } from '@/lib/ai'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const expectedKey = process.env.N8N_API_KEY

    // Auth check if configured
    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
