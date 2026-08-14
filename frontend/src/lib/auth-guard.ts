import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const AUTHORIZED_EMAIL = 'pranaviyadav57@gmail.com'

export async function verifyServerAuthorization(req: Request): Promise<{ authorized: boolean; userId?: string; response?: NextResponse }> {
  // 1. Allow internal n8n service calls authenticated via N8N_API_KEY
  const authHeader = req.headers.get('authorization')
  const expectedN8nKey = process.env.N8N_API_KEY

  if (expectedN8nKey && authHeader === `Bearer ${expectedN8nKey}`) {
    return { authorized: true }
  }

  // 2. Extract Bearer token or session cookie for user authentication
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

  if (!bearerToken) {
    return {
      authorized: false,
      response: NextResponse.json({ error: '401 Unauthorized: Missing session authentication token.' }, { status: 401 })
    }
  }

  try {
    const admin = getSupabaseAdmin()
    const { data: { user }, error } = await admin.auth.getUser(bearerToken)

    if (error || !user) {
      return {
        authorized: false,
        response: NextResponse.json({ error: '401 Unauthorized: Invalid or expired session.' }, { status: 401 })
      }
    }

    if (user.email?.trim().toLowerCase() !== AUTHORIZED_EMAIL) {
      return {
        authorized: false,
        response: NextResponse.json({ error: '403 Forbidden: Access restricted to authorized account.' }, { status: 403 })
      }
    }

    return { authorized: true, userId: user.id }
  } catch (err: any) {
    return {
      authorized: false,
      response: NextResponse.json({ error: `401 Unauthorized: ${err.message}` }, { status: 401 })
    }
  }
}
