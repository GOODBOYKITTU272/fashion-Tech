import { NextResponse } from 'next/server'

// OAuth Callback Route for Official LinkedIn 3-Legged OAuth
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(errorDescription || error)}`, req.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings?error=No+authorization+code+received', req.url))
  }

  // Handle authorization code exchange in production when CLIENT_ID and CLIENT_SECRET are available
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  const redirectUri = `${new URL(req.url).origin}/api/auth/linkedin/callback`

  if (!clientId || !clientSecret) {
    // Label state as WAITING_FOR_API_ACCESS if developer app credentials not yet set
    return NextResponse.redirect(new URL('/settings?status=WAITING_FOR_API_ACCESS', req.url))
  }

  try {
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      })
    })

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text()
      return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(errText)}`, req.url))
    }

    const tokenData = await tokenResponse.json()
    // Successfully received tokenData.access_token & tokenData.expires_in
    // In production, encrypt using encryptToken() and save to linkedin_credentials via service role

    return NextResponse.redirect(new URL('/settings?status=CONNECTED', req.url))
  } catch (err: any) {
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(err.message)}`, req.url))
  }
}
