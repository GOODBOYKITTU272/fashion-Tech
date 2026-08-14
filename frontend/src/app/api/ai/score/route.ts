import { NextResponse } from 'next/server'
import { scoreTopic } from '@/lib/ai'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const expectedKey = process.env.N8N_API_KEY
    
    // Auth check if configured
    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
