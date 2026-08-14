import { NextResponse } from 'next/server'
import { verifyServerAuthorization } from '@/lib/auth-guard'
import { importKnownLinkedInNativePosts } from '@/lib/linkedin-native-sync'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const auth = await verifyServerAuthorization(req)
    if (!auth.authorized || auth.response || !auth.userId) {
      return auth.response || NextResponse.json({ error: '401 Unauthorized' }, { status: 401 })
    }

    const result = await importKnownLinkedInNativePosts(auth.userId)

    return NextResponse.json({
      success: result.errors.length === 0,
      sync_mode: 'MANUAL_IMPORT',
      imported_count: result.importedCount,
      updated_count: result.updatedCount,
      errors: result.errors
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
