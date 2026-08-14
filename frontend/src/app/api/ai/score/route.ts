import { NextResponse } from 'next/server'
import { scoreTopic } from '@/lib/ai'
import { verifyServerAuthorization } from '@/lib/auth-guard'

export async function POST(req: Request) {
  const auth = await verifyServerAuthorization(req)
  if (!auth.authorized) {
    return auth.response!
  }

  try {
    const { title, summary } = await req.json()
    if (!title) {
      return NextResponse.json({ error: 'Missing title' }, { status: 400 })
    }

    const score = await scoreTopic(title, summary || '')
    return NextResponse.json(score)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Scoring failed' }, { status: 500 })
  }
}
