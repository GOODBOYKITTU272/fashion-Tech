import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { encryptToken } from '@/lib/crypto'

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

  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  const redirectUri = `${new URL(req.url).origin}/api/auth/linkedin/callback`

  if (!clientId || !clientSecret) {
    // Return WAITING_FOR_API_ACCESS if developer app credentials not yet configured
    return NextResponse.redirect(new URL('/settings?status=WAITING_FOR_API_ACCESS', req.url))
  }

  try {
    // 1. Exchange authorization code for LinkedIn access token
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
      return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent('LinkedIn token exchange failed: ' + errText)}`, req.url))
    }

    const tokenData = await tokenResponse.json()
    if (!tokenData || !tokenData.access_token) {
      return NextResponse.redirect(new URL('/settings?error=Token+exchange+succeeded+but+access_token+was+missing', req.url))
    }

    const accessToken = tokenData.access_token as string
    const expiresInSeconds = Number(tokenData.expires_in || 5184000) // Default 60 days
    const grantedScopes = typeof tokenData.scope === 'string' 
      ? tokenData.scope.split(/[\s,]+/) 
      : ['w_member_social', 'r_member_postAnalytics', 'r_member_profileAnalytics']

    // 2. Fetch authenticated user URN from LinkedIn userinfo endpoint if scope permits
    let memberUrn = null
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

    // 4. Obtain target system user_id via Supabase Admin Client
    const admin = getSupabaseAdmin()
    const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
    const targetUserId = usersData?.users?.[0]?.id

    if (!targetUserId) {
      // Fallback query to find existing connections user_id or automation_settings user_id
      const { data: existingConn } = await admin.from('linkedin_connections').select('user_id').limit(1)
      if (!existingConn?.[0]?.user_id) {
        return NextResponse.redirect(new URL('/settings?error=No+system+user_id+found+in+database+for+OAuth+persistence', req.url))
      }
    }

    const ownerUserId = targetUserId || (await admin.from('linkedin_connections').select('user_id').limit(1)).data?.[0]?.user_id

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
      // Revert connection status if secrets failed to save
      await admin
        .from('linkedin_connections')
        .update({ integration_status: 'ERROR', auth_status: 'revoked', reauthorization_required: true })
        .eq('id', connRecord.id)

      throw new Error(`Failed to persist encrypted credentials: ${credError.message}`)
    }

    // 7. SUCCESS — Redirect with status CONNECTED
    return NextResponse.redirect(new URL('/settings?status=CONNECTED', req.url))
  } catch (err: any) {
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(err.message || 'OAuth persistence failed')}`, req.url))
  }
}
