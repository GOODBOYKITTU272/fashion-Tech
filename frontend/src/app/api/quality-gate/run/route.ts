import { NextResponse } from 'next/server'
import { verifyServerAuthorization } from '@/lib/auth-guard'
import { runQualityGate } from '@/lib/quality-gate'

export async function POST(req: Request) {
  const auth = await verifyServerAuthorization(req)
  if (!auth.authorized) {
    return auth.response!
  }

  try {
    const body = await req.json()
    const { draftId, title, bodyText, pillar, format, hasPersonalInput } = body

    if (!draftId || !title) {
      return NextResponse.json({ error: 'Missing required parameters: draftId and title.' }, { status: 400 })
    }

    const result = await runQualityGate({
      draftId,
      title,
      body: bodyText || '',
      pillar: pillar || 'Educational',
      format: format || 'carousel',
      hasPersonalInput: !!hasPersonalInput
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Quality gate run failed' }, { status: 500 })
  }
}
