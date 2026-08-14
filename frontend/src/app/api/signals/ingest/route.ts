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
      message: 'Research signal ingestion completed via safe HTTP connectors',
      ...result
    })
  } catch (error: any) {
    console.error('API /api/signals/ingest Exception:', error)
    return NextResponse.json({
      error: error.message || 'Signal ingestion failed',
      ingestion_status: 'ERROR',
      runtime: 'SAFE_HTTP_CONNECTORS',
      agent_reach_local_status: 'READY',
      agent_reach_production_status: 'NOT_DEPLOYED'
    }, { status: 500 })
  }
}
