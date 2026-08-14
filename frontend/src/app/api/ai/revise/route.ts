import { NextResponse } from 'next/server'
import { reviseDraftContent } from '@/lib/ai'
import { verifyServerAuthorization } from '@/lib/auth-guard'

export async function POST(req: Request) {
  const auth = await verifyServerAuthorization(req)
  if (!auth.authorized) {
    return auth.response!
  }

  try {
    const { title, full_content, instructions, format } = await req.json()
    if (!title || !full_content || !instructions) {
      return NextResponse.json({ error: 'Missing title, full_content, or instructions' }, { status: 400 })
    }

    const revised = await reviseDraftContent(title, full_content, instructions, format || 'carousel')
    return NextResponse.json({ success: true, ...revised })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Revision failed' }, { status: 500 })
  }
}
