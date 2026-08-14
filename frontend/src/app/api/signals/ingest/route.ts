import { NextResponse } from 'next/server'
import { verifyServerAuthorization } from '@/lib/auth-guard'
import { runAgentReachW1Ingestion } from '@/lib/agent-reach-adapter'

export async function POST(req: Request) {
  const auth = await verifyServerAuthorization(req)
  if (!auth.authorized || !auth.userId) {
    return auth.response || NextResponse.json({ error: '401 Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runAgentReachW1Ingestion(auth.userId)

    return NextResponse.json({
      message: 'Agent Reach W1 research signal ingestion completed',
      agent_reach_status: 'LOCAL_READY',
      connector: 'Agent Reach (Jina Web Reader & Safe RSS)',
      ...result
    })
  } catch (error: any) {
    console.error('API /api/signals/ingest Exception:', error)
    return NextResponse.json({
      error: error.message || 'Signal ingestion failed',
      agent_reach_status: 'ERROR'
    }, { status: 500 })
  }
}
