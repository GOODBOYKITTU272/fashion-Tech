import { NextResponse } from 'next/server'
import { encryptToken } from '@/lib/crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { AUTHORIZED_EMAIL } from '@/lib/auth-guard'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    console.error('LinkedIn OAuth Callback Error:', error, errorDescription)
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(errorDescription || error)}`, req.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings?error=Missing+authorization+code', req.url))
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://fashion-tech-delta.vercel.app'}/api/auth/linkedin/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/settings?error=LinkedIn+Developer+App+credentials+(LINKEDIN_CLIENT_ID)+are+not+configured+yet.+Integration+is+WAITING_FOR_API_ACCESS.', req.url))
  }

  try {
    // 1. Exchange code for access token via official LinkedIn Token Endpoint
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      })
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || !tokenData.access_token) {
      const msg = tokenData.error_description || tokenData.error || 'Failed to exchange OAuth code for access token'
      return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(msg)}`, req.url))
    }

    const accessToken: string = tokenData.access_token
    const expiresInSeconds: number = tokenData.expires_in || 5184000 // 60 days default
    const grantedScopes: string[] = tokenData.scope ? tokenData.scope.split(' ') : ['w_member_social', 'r_member_postAnalytics']

    // 2. Fetch LinkedIn Member URN if userinfo endpoint is accessible
    let memberUrn: string | null = null
    try {
      const userinfoRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (userinfoRes.ok) {
        const userinfo = await userinfoRes.json()
        memberUrn = userinfo.sub ? `urn:li:person:${userinfo.sub}` : null
      }
    } catch {
      // Userinfo fetch is optional
    }

    // 3. Encrypt the access token using AES-256-GCM (fails closed if encryption key missing)
    const encrypted = encryptToken(accessToken)

    // 4. Obtain target system user_id specifically for AUTHORIZED_EMAIL via Supabase Admin Client
    const admin = getSupabaseAdmin()
    const { data: usersData } = await admin.auth.admin.listUsers()
    const targetUser = usersData?.users?.find(u => u.email?.trim().toLowerCase() === AUTHORIZED_EMAIL)

    if (!targetUser) {
      return NextResponse.redirect(new URL('/settings?error=Authorized+system+user+account+not+found+in+database', req.url))
    }

    const ownerUserId = targetUser.id
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()
    const now = new Date().toISOString()

    // 5. Upsert safe connection metadata into linkedin_connections
    const { data: connRecord, error: connError } = await admin
      .from('linkedin_connections')
      .upsert({
        user_id: ownerUserId,
        linkedin_member_urn: memberUrn,
        granted_scopes: grantedScopes,
        integration_status: 'CONNECTED',
        auth_status: 'valid',
        expires_at: expiresAt,
        last_verified_at: now,
        reauthorization_required: false,
        updated_at: now
      }, { onConflict: 'user_id' })
      .select()
      .single()

    if (connError || !connRecord) {
      throw new Error(`Failed to persist connection metadata: ${connError?.message}`)
    }

    // 6. Upsert server-only encrypted secrets into linkedin_credentials
    const { error: credError } = await admin
      .from('linkedin_credentials')
      .upsert({
        connection_id: connRecord.id,
        access_token_ciphertext: encrypted.ciphertext,
        encryption_iv: encrypted.iv,
        encryption_auth_tag: encrypted.authTag,
        updated_at: now
      }, { onConflict: 'connection_id' })

    if (credError) {
      throw new Error(`Failed to persist encrypted access token: ${credError.message}`)
    }

    return NextResponse.redirect(new URL('/settings?success=LinkedIn+account+connected+successfully', req.url))
  } catch (err: any) {
    console.error('LinkedIn OAuth Callback Exception:', err)
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(err.message || 'OAuth callback failed')}`, req.url))
  }
}
