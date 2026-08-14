import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST() {
  try {
    const apiKey = process.env.ZERNIO_API_KEY
    if (!apiKey || apiKey.startsWith('your-')) {
      return NextResponse.json({
        success: false,
        error: 'Zernio API key is not configured.'
      }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // 1. Fetch successful publishing attempts with Zernio post IDs
    const { data: attempts, error: attError } = await admin
      .from('publishing_attempts')
      .select('id, calendar_id, published_post_id, response_metadata')
      .eq('status', 'LIVE_SUCCESS')

    if (attError) throw attError

    // 2. Fetch CSV-imported published posts with Zernio post IDs
    const { data: csvPosts, error: csvError } = await admin
      .from('published_posts')
      .select('id, calendar_id, native_post_id, linkedin_post_url')

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

    // Map successful publishing attempts (ensure published_posts row exists)
    if (attempts) {
      for (const att of attempts) {
        const metadata = (att.response_metadata as any) || {}
        const zernioPostId = metadata.zernio_post_id || metadata.published_urn
        if (!zernioPostId) continue

        let publishedPostId = att.published_post_id

        if (!publishedPostId) {
          // Check if published_post row already exists for this calendar item
          const { data: existingPost } = await admin
            .from('published_posts')
            .select('id')
            .eq('calendar_id', att.calendar_id)
            .maybeSingle()

          if (existingPost) {
            publishedPostId = existingPost.id
          } else {
            // Create published_posts record
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
              // Link attempt to published post
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
    const errors: string[] = []

    // 3. For each unique Zernio post, fetch metrics from Zernio API and update DB
    for (const post of postsToSync) {
      try {
        const zernioRes = await fetch(`https://api.zernio.com/v1/analytics/${post.zernioPostId}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        })

        if (!zernioRes.ok) {
          throw new Error(`Zernio responded with status ${zernioRes.status}`)
        }

        const data = await zernioRes.json()
        const metrics = data.metrics || data || {}

        const impressions = Number(metrics.impressions || metrics.views || 0)
        const reactions = Number(metrics.reactions || metrics.likes || 0)
        const comments = Number(metrics.comments || 0)
        const reposts = Number(metrics.reposts || metrics.shares || 0)

        // Insert fresh snapshot into post_metrics
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

    return NextResponse.json({
      success: true,
      sync_count: syncCount,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || err
    }, { status: 500 })
  }
}
