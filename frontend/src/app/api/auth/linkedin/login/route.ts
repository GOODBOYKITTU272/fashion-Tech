import { NextResponse } from 'next/server'

// OAuth Login Initiator — Redirects user to official LinkedIn OAuth consent screen
export async function GET(req: Request) {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const origin = new URL(req.url).origin
  const redirectUri = `${origin}/api/auth/linkedin/callback`

  if (!clientId) {
    return NextResponse.redirect(
      new URL('/settings?error=LinkedIn+Developer+App+credentials+(LINKEDIN_CLIENT_ID)+are+not+configured+yet.+Integration+is+WAITING_FOR_API_ACCESS.', req.url)
    )
  }

  // Scopes for Community Management API platform
  const scopes = 'w_member_social r_member_postAnalytics r_member_profileAnalytics'
  const state = Math.random().toString(36).substring(2, 15)

  const linkedinAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?${new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state: state,
    scope: scopes
  }).toString()}`

  return NextResponse.redirect(linkedinAuthUrl)
}
