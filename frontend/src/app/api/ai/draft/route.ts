import { NextResponse } from 'next/server'
import { generateDraft } from '@/lib/ai'
import { verifyServerAuthorization } from '@/lib/auth-guard'

export async function POST(req: Request) {
  const auth = await verifyServerAuthorization(req)
  if (!auth.authorized) {
    return auth.response!
  }

  try {
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
