import { getSupabaseAdmin } from './supabase-admin'
import crypto from 'crypto'

export interface KnownLinkedInNativePost {
  title: string
  content_preview: string
  planned_date: string
  planned_time: string
  external_scheduled_at_utc: string
  external_timezone: string
  pillar: string
  format: string
  source: 'linkedin_native'
}

export const TRUTHFUL_LINKEDIN_NATIVE_POSTS: KnownLinkedInNativePost[] = [
  {
    title: 'From code to craft.',
    content_preview: 'From code to craft.',
    planned_date: '2026-08-14',
    planned_time: '20:30:00',
    external_scheduled_at_utc: '2026-08-14T15:00:00Z',
    external_timezone: 'Asia/Kolkata',
    pillar: 'Educational',
    format: 'single_image',
    source: 'linkedin_native'
  },
  {
    title: 'When I moved from Computer Science into Fashion Design, I thought I was entering a completely different world.',
    content_preview: 'When I moved from Computer Science into Fashion Design, I thought I was entering a completely different world.',
    planned_date: '2026-08-17',
    planned_time: '20:30:00',
    external_scheduled_at_utc: '2026-08-17T15:00:00Z',
    external_timezone: 'Asia/Kolkata',
    pillar: 'Educational',
    format: 'single_image',
    source: 'linkedin_native'
  },
  {
    title: 'One week into my M.Des. in Fashion Design, I got the chance to volunteer at a fashion event.',
    content_preview: 'One week into my M.Des. in Fashion Design, I got the chance to volunteer at a fashion event.',
    planned_date: '2026-08-18',
    planned_time: '20:30:00',
    external_scheduled_at_utc: '2026-08-18T15:00:00Z',
    external_timezone: 'Asia/Kolkata',
    pillar: 'Educational',
    format: 'single_image',
    source: 'linkedin_native'
  }
]

export function generateExternalFingerprint(
  userId: string,
  platform: string,
  contentPreview: string,
  scheduledAtUtc: string
): string {
  const norm = contentPreview.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  return crypto.createHash('sha256').update(`${userId}:${platform}:${norm}:${scheduledAtUtc}`).digest('hex')
}

export async function importKnownLinkedInNativePosts(userId: string): Promise<{ importedCount: number; updatedCount: number; errors: string[] }> {
  if (!userId) return { importedCount: 0, updatedCount: 0, errors: ['User ID is required'] }

  const admin = getSupabaseAdmin()
  let importedCount = 0
  let updatedCount = 0
  const errors: string[] = []

  for (const post of TRUTHFUL_LINKEDIN_NATIVE_POSTS) {
    try {
      const fingerprint = generateExternalFingerprint(userId, 'linkedin', post.content_preview, post.external_scheduled_at_utc)

      // 1. Check for exact fingerprint match in content_calendar
      const { data: existingFingerprint } = await admin
        .from('content_calendar')
        .select('id')
        .eq('external_fingerprint', fingerprint)
        .limit(1)

      if (existingFingerprint && existingFingerprint.length > 0) {
        // Update external metadata strictly for matching fingerprint
        await admin.from('content_calendar').update({
          source: 'linkedin_native',
          external_platform: 'linkedin',
          external_post_type: 'scheduled',
          external_status: 'scheduled',
          external_timezone: post.external_timezone,
          external_scheduled_at: post.external_scheduled_at_utc,
          quality_gate_status: null,
          confidence_score: null
        }).eq('id', existingFingerprint[0].id)

        updatedCount++
        continue
      }

      // 2. Create external draft snapshot (non-AI snapshot)
      const { data: draft, error: draftErr } = await admin.from('drafts').insert({
        user_id: userId,
        title: post.title,
        hook: post.content_preview,
        full_content: post.content_preview,
        pillar: post.pillar,
        format: post.format,
        quality_gate_status: null,
        confidence_score: null,
        text_provider: 'linkedin_native',
        text_model: 'external_snapshot',
        image_generation_status: 'none'
      }).select('id').single()

      if (draftErr || !draft) {
        errors.push(`Failed to create external draft for ${post.title}: ${draftErr?.message}`)
        continue
      }

      // 3. Insert new external row into content_calendar
      const { error: calendarErr } = await admin.from('content_calendar').insert({
        user_id: userId,
        draft_id: draft.id,
        planned_date: post.planned_date,
        planned_time: post.planned_time,
        pillar: post.pillar,
        format: post.format,
        status: 'scheduled',
        quality_gate_status: null,
        confidence_score: null,
        source: 'linkedin_native',
        external_platform: 'linkedin',
        external_post_type: 'scheduled',
        external_status: 'scheduled',
        external_timezone: post.external_timezone,
        external_scheduled_at: post.external_scheduled_at_utc,
        external_fingerprint: fingerprint
      })

      if (calendarErr) {
        if (calendarErr.code === '23505') {
          updatedCount++
        } else {
          errors.push(`Failed to insert calendar row for ${post.title}: ${calendarErr.message}`)
        }
      } else {
        importedCount++
      }
    } catch (err: any) {
      errors.push(`Error importing ${post.title}: ${err.message}`)
    }
  }

  return { importedCount, updatedCount, errors }
}
