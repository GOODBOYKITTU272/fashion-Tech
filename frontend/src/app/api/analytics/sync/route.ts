import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { verifyServerAuthorization } from '@/lib/auth-guard'

export async function POST(req: Request) {
  try {
    // 1. Authenticate Request
    const auth = await verifyServerAuthorization(req)
    if (!auth.authorized || !auth.userId) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.ZERNIO_API_KEY
    if (!apiKey || apiKey.startsWith('your-')) {
      return NextResponse.json({
        success: false,
        zernio_analytics_supported: 'UNKNOWN_AUTH_ERROR',
        eligible_count: 0,
        success_count: 0,
        failed_count: 0,
        error: 'Zernio API key is not configured.'
      }, { status: 200 }) // Fail gracefully
    }

    const admin = getSupabaseAdmin()

    // 2. Fetch successful publishing attempts with Zernio post IDs (User Scoped)
    const { data: attempts, error: attError } = await admin
      .from('publishing_attempts')
      .select('id, calendar_id, published_post_id, response_metadata')
      .eq('user_id', auth.userId)
      .eq('status', 'LIVE_SUCCESS')

    if (attError) throw attError

    // 3. Fetch CSV-imported published posts with Zernio post IDs (User Scoped via join)
    const { data: csvPosts, error: csvError } = await admin
      .from('published_posts')
      .select(`
        id, calendar_id, native_post_id, linkedin_post_url,
        content_calendar!inner (
          user_id
        )
      `)
      .eq('content_calendar.user_id', auth.userId)

    if (csvError) throw csvError

    const postsToSync: Array<{ publishedPostId: string; zernioPostId: string }> = []

    // Map CSV-imported posts
    if (csvPosts) {
      for (const p of csvPosts) {
        if (p.native_post_id && p.native_post_id.trim()) {
          postsToSync.push({
            publishedPostId: p.id,
            zernioPostId: p.native_post_id.trim()
          })
        }
      }
    }

    // Map successful publishing attempts
    if (attempts) {
      for (const att of attempts) {
        const metadata = (att.response_metadata as any) || {}
        const zernioPostId = metadata.zernio_post_id || metadata.published_urn
        if (!zernioPostId) continue

        let publishedPostId = att.published_post_id

        if (!publishedPostId) {
          const { data: existingPost } = await admin
            .from('published_posts')
            .select('id')
            .eq('calendar_id', att.calendar_id)
            .maybeSingle()

          if (existingPost) {
            publishedPostId = existingPost.id
          } else {
            const { data: newPost, error: insertPostErr } = await admin
              .from('published_posts')
              .insert({
                calendar_id: att.calendar_id,
                linkedin_post_url: metadata.published_url || '',
                native_post_id: zernioPostId
              })
              .select('id')
              .single()

            if (!insertPostErr && newPost) {
              publishedPostId = newPost.id
              await admin
                .from('publishing_attempts')
                .update({ published_post_id: publishedPostId })
                .eq('id', att.id)
            }
          }
        }

        if (publishedPostId) {
          postsToSync.push({
            publishedPostId,
            zernioPostId
          })
        }
      }
    }

    let syncCount = 0
    let failedCount = 0
    let authError = false
    const errors: string[] = []

    // 4. For each unique Zernio post, fetch metrics
    for (const post of postsToSync) {
      try {
        const zernioRes = await fetch(`https://api.zernio.com/v1/analytics/${post.zernioPostId}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        })

        if (zernioRes.status === 401 || zernioRes.status === 403) {
          authError = true
          failedCount++
          errors.push(`Zernio authentication failed for post ${post.zernioPostId}`)
          continue
        }

        if (!zernioRes.ok) {
          failedCount++
          throw new Error(`Zernio responded with status ${zernioRes.status}`)
        }

        const data = await zernioRes.json()
        
        if (!data || (typeof data !== 'object')) {
          failedCount++
          throw new Error(`Invalid schema returned from Zernio analytics API`)
        }

        const metrics = data.metrics || data || {}

        const impressions = metrics.impressions !== undefined || metrics.views !== undefined
          ? Number(metrics.impressions !== undefined ? metrics.impressions : metrics.views)
          : null
        const reactions = metrics.reactions !== undefined || metrics.likes !== undefined
          ? Number(metrics.reactions !== undefined ? metrics.reactions : metrics.likes)
          : null
        const comments = metrics.comments !== undefined ? Number(metrics.comments) : null
        const reposts = metrics.reposts !== undefined || metrics.shares !== undefined
          ? Number(metrics.reposts !== undefined ? metrics.reposts : metrics.shares)
          : null

        await admin
          .from('post_metrics')
          .insert({
            published_post_id: post.publishedPostId,
            impressions,
            reactions,
            comments,
            reposts,
            snapshot_at: new Date().toISOString()
          })

        syncCount++
      } catch (err: any) {
        errors.push(`Failed to sync post ${post.zernioPostId}: ${err.message}`)
      }
    }

    let supportStatus = 'UNKNOWN_NO_ELIGIBLE_POST'
    if (postsToSync.length > 0) {
      if (syncCount > 0) supportStatus = 'YES'
      else if (authError) supportStatus = 'UNKNOWN_AUTH_ERROR'
      else supportStatus = 'NO'
    }

    return NextResponse.json({
      success: true,
      zernio_analytics_supported: supportStatus,
      eligible_count: postsToSync.length,
      success_count: syncCount,
      failed_count: failedCount,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || err
    }, { status: 500 })
  }
}
