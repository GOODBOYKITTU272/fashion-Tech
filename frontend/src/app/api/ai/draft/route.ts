import { NextResponse } from 'next/server'
import { generateDraft } from '@/lib/ai'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const expectedKey = process.env.N8N_API_KEY

    // Auth check if configured
    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, summary, pillar, format, personalInput } = await req.json()
    if (!title) {
      return NextResponse.json({ error: 'Missing title' }, { status: 400 })
    }

    const draft = await generateDraft(
      title,
      summary || '',
      pillar || 'Educational',
      format || 'carousel',
      personalInput || ''
    )
    return NextResponse.json(draft)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Drafting failed' }, { status: 500 })
  }
}
