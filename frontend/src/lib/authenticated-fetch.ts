import { supabase } from '@/lib/supabase'

export async function authenticatedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()

  const accessToken = session?.access_token

  if (!accessToken) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login?error=Session+expired.+Please+log+in+again.'
    }
    return new Response(JSON.stringify({ error: '401 Unauthorized: Missing active session token.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const headers = new Headers(init?.headers || {})
  headers.set('Authorization', `Bearer ${accessToken}`)

  const response = await fetch(input, {
    ...init,
    headers
  })

  if (response.status === 401 && typeof window !== 'undefined') {
    window.location.href = '/login?error=Session+invalid+or+expired.'
  }

  return response
}
